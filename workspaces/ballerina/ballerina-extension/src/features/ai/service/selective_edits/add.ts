// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { ModelMessage, streamText, stepCountIs } from "ai";
import {
    GenerateAICodeAddRequest,
    SourceFiles,
    ProjectSource,
    OperationType
} from "@wso2/ballerina-core";
import { getAnthropicClient, ANTHROPIC_SONNET_4, getProviderCacheControl, ANTHROPIC_HAIKU_4 } from "../connection";
import { getProjectSource } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { transformProjectSource } from "../utils";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";
import {
    createWriteExecute,
    createWriteTool,
    createEditExecute,
    createEditTool,
    createMultiEditExecute,
    createBatchEditTool,
    createReadExecute,
    createReadTool,
    FILE_WRITE_TOOL_NAME,
    FILE_SINGLE_EDIT_TOOL_NAME,
    FILE_BATCH_EDIT_TOOL_NAME,
    FILE_READ_TOOL_NAME,
} from "../libs/text_editor_tool";
import { modifyFileContent } from "../../../../utils/modification";
import { workspace } from "vscode";
import * as path from "path";

/**
 * Generate targeted code edits at a specific cursor position
 * @param param Request containing user prompt, file path, and cursor position
 */
export async function generateEdits(param: GenerateAICodeAddRequest): Promise<void> {
    // const eventHandler: CopilotEventHandler = createWebviewEventHandler(Command.Code);

    try {
        // eventHandler({ type: "start" });

        // 1. Fetch project source
        const project: ProjectSource = await getProjectSource("CODE_GENERATION" as OperationType);
        const packageName = project.projectName;
        const sourceFiles: SourceFiles[] = transformProjectSource(project);

        // 2. Set up tracking arrays for file modifications
        let updatedSourceFiles: SourceFiles[] = [...sourceFiles];
        let updatedFileNames: string[] = [];

        // 3. Set up file editing tools using factory functions
        const tools = {
            [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(updatedSourceFiles, updatedFileNames)),
            [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(updatedSourceFiles, updatedFileNames)),
            [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(updatedSourceFiles, updatedFileNames)),
            [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(updatedSourceFiles, updatedFileNames)),
        };

        // 4. Build cursor-aware prompts
        const systemPrompt = buildSystemPrompt(packageName);
        const userPrompt = buildUserPrompt(param, sourceFiles);

        // 5. Prepare messages with cache control
        const cacheOptions = await getProviderCacheControl();
        const allMessages: ModelMessage[] = [
            {
                role: "system",
                content: systemPrompt,
                providerOptions: cacheOptions,
            },
            {
                role: "user",
                content: userPrompt,
                providerOptions: cacheOptions,
            },
        ];
        // 6. Stream LLM response with tools
        const { fullStream } = streamText({
            model: await getAnthropicClient(ANTHROPIC_HAIKU_4),
            maxOutputTokens: 4096 * 4,
            temperature: 0,
            messages: allMessages,
            stopWhen: stepCountIs(50),
            tools,
            abortSignal: AIPanelAbortController.getInstance().signal,
            experimental_telemetry: { isEnabled: true}

        });

        // 7. Process stream events
        let assistantResponse = "";
        for await (const part of fullStream) {
            switch (part.type) {
                case "tool-call":
                    // eventHandler({ type: "tool_call", toolName: part.toolName });
                    break;

                case "tool-result":
                    // eventHandler({ type: "tool_result", toolName: part.toolName, toolOutput: part.output });
                    break;

                case "text-delta":
                    assistantResponse += part.text;
                    // eventHandler({ type: "content_block", content: part.text });
                    break;

                case "error":
                    console.error("Stream error:", part.error);
                    throw part.error;

                case "finish":
                    console.log("Stream finished:", part.finishReason);
                    break;

                default:
                    break;
            }
        }

        // 8. Apply workspace edits for all modified files
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error("No workspace folders found.");
        }
        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;

        for (const fileName of updatedFileNames) {
            const sourceFile = updatedSourceFiles.find(sf => sf.filePath === fileName);
            if (sourceFile) {
                // Join workspace path with relative file path to get absolute path
                const absoluteFilePath = path.join(workspaceFolderPath, sourceFile.filePath);
                await modifyFileContent({
                    filePath: absoluteFilePath,
                    content: sourceFile.content,
                    skipForceSave: false,
                    updateViewFlag: true,
                });
            }
        }

        // 9. Send completion notification
        // eventHandler({ type: "stop", command: Command.Code });

    } catch (error) {
        console.error("Error during selective edit generation:", error);
        // eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

/**
 * Build system prompt for selective edits
 */
function buildSystemPrompt(packageName: string): string {
    return `You are an expert Ballerina code editor assistant. Your task is to make targeted code edits based on user requests.

## Context
- Project name: ${packageName}
- You have access to the full project source code
- The user has specified a cursor position where they want changes

## Your Capabilities
You have access to file editing tools:
- \`file_read\`: Read current file contents
- \`file_edit\`: Make single find-and-replace edits
- \`file_batch_edit\`: Make multiple edits in one file
- \`file_write\`: Create new files if needed

## Instructions
1. **Understand the request**: Carefully read the user's prompt and the cursor position
2. **Make targeted edits**: Focus your edits at or near the specified cursor location
3. **Use appropriate tools**: Use file_edit or file_batch_edit for modifications
4. **Be precise**: Make exact string replacements - the old_string must match exactly
5. **Maintain code quality**: Ensure edits follow Ballerina best practices and syntax
6. **Explain your changes**: Provide clear explanations of what you're changing and why

## Important Notes
- Always read the file first if you need to see current content
- The cursor position indicates where the user is focused - prioritize edits in that area
- Use file_batch_edit when making multiple related changes in one file
- Ensure all edits maintain valid Ballerina syntax`;
}

/**
 * Build user prompt with cursor context
 */
function buildUserPrompt(param: GenerateAICodeAddRequest, sourceFiles: SourceFiles[]): string {
    const { prompt, filePath, position } = param;

    // Find the current file content
    const currentFile = sourceFiles.find(sf => filePath.endsWith(sf.filePath));
    const fileContent = currentFile ? currentFile.content : "File not found in project";

    // Get lines around cursor for context (10 lines before and after)
    const lines = fileContent.split('\n');
    const cursorLine = position.line;
    const startLine = Math.max(0, cursorLine - 10);
    const endLine = Math.min(lines.length, cursorLine + 10);
    const contextLines = lines.slice(startLine, endLine);
    const contextWithNumbers = contextLines
        .map((line, idx) => `${startLine + idx + 1}: ${line}`)
        .join('\n');

    // Format all source files with filenames
    const allFilesContent = sourceFiles
        .map(sf => `### File: ${sf.filePath}
\`\`\`ballerina
${sf.content}
\`\`\``)
        .join('\n\n');

    return `## User Request
${prompt}

## Cursor Location
File: ${filePath}
Line: ${position.line + 1}
Character: ${position.character}

## Current File Context (lines ${startLine + 1}-${endLine})
\`\`\`ballerina
${contextWithNumbers}
\`\`\`

## Full Project Source Files
${allFilesContent}

Please make the requested changes at or near the cursor position. Use the file editing tools to apply your changes.`;
}
