/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import styled from "@emotion/styled";

export const FlexRow = styled.div({
    display: "flex",
    flexDirection: "row",
});

export const AIChatView = styled.div({
    display: "flex",
    flexDirection: "column",
    height: "100%",
});

export const Header = styled.header({
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "10px",
    gap: "10px",
});

export const HeaderButtons = styled.div({
    display: "flex",
    justifyContent: "flex-end",
    marginRight: "10px",
});

export const Main = styled.main({
    flex: 1,
    flexDirection: "column",
    overflowY: "auto",
});

export const ChatMessage = styled.div({
    padding: "20px",
    borderTop: "1px solid var(--vscode-editorWidget-border)",
});

export const Badge = styled.div`
    // padding: 5px;
    // margin-left: 10px;
    display: inline-block;
    text-align: left;
`;

export const ResetsInBadge = styled.div`
    font-size: 10px;
`;

export const UsageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const UsageLabel = styled.div`
    font-size: 12px;
`;

export const ProgressBarContainer = styled.div`
    position: relative;
    width: 150px;
    height: 8px;
    background-color: var(--vscode-inputValidation-errorBackground);
    border-radius: 4px;
    overflow: visible;
    cursor: pointer;

    &:hover .usage-tooltip {
        opacity: 1;
    }
`;

interface ProgressBarFillProps {
    percentage: number;
}

export const ProgressBarFill = styled.div<ProgressBarFillProps>`
    height: 100%;
    width: ${(props: ProgressBarFillProps) => props.percentage}%;
    background-color: ${(props: ProgressBarFillProps) => {
        if (props.percentage > 50) return '#4caf50'; // Green
        if (props.percentage > 20) return '#ff9800'; // Orange
        return '#f44336'; // Red
    }};
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 4px;
`;

export const UsageTooltip = styled.div`
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 4px 8px;
    background-color: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1000;
`;
