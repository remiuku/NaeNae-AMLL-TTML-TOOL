# Contributing to AMLL TTML Tool | 贡献指南

English | [简体中文](#简体中文)

Welcome to the AMLL TTML Tool! We are excited that you are interested in contributing. Whether you are fixing a bug, adding a feature, or improving documentation, your help is appreciated.

---

## English

### 🛠️ Development Setup

This project is a React-based application using Vite, Jotai for state management, and Radix UI for components. It also supports desktop builds via Tauri.

1.  **Prerequisites**:
    *   Node.js (LTS recommended)
    *   [pnpm](https://pnpm.io/) (Mandatory: do not use npm/yarn)
    *   Rust & Cargo (If you plan to work on Tauri/WASM features)
2.  **Installation**:
    ```bash
    pnpm install
    ```
3.  **Development**:
    *   Web: `pnpm dev`
    *   Desktop: `pnpm tauri dev`
4.  **Linting & Formatting**:
    *   We use [Biome](https://biomejs.dev/). Please run `pnpm fmt` before committing.

### 🏗️ Project Structure

*   `src/components`: UI components (Radix UI + CSS Modules).
*   `src/modules`: Core logic, including audio processing and plugin systems.
*   `src/states`: Jotai atoms for global state.
*   `src-tauri`: Backend code for the desktop version (Rust).
*   `locales`: Translation files managed via Crowdin.

### 🔌 Plugin Development

The tool supports Extism-based WASM plugins.
*   WASM plugins should be compiled for the `wasm32-unknown-unknown` target.
*   Refer to `PLUGIN.md` for the technical specifications of the plugin API.
*   Check `src/modules/plugins` for the implementation details.

### 🌍 Localization

We use `i18next` for translations.
*   If you want to contribute a new language, please use our [Crowdin Project](https://crowdin.com/project/very-cool-ttml-tool).
*   Local changes can be tested in `locales/`.

---

## 简体中文

感谢你对 AMLL TTML Tool 的关注！我们欢迎各种形式的贡献，包括修复 Bug、增加功能、改进文档或提供翻译。

### 🛠️ 开发环境配置

本项目是基于 React 的应用程序，使用 Vite 构建，Jotai 进行状态管理，Radix UI 驱动组件库。同时支持通过 Tauri 构建桌面端。

1.  **准备工作**:
    *   Node.js (建议 LTS 版本)
    *   [pnpm](https://pnpm.io/) (**必须**：请勿使用 npm/yarn)
    *   Rust & Cargo (如果你需要开发 Tauri 或 WASM 相关功能)
2.  **安装依赖**:
    ```bash
    pnpm install
    ```
3.  **启动开发环境**:
    *   网页端: `pnpm dev`
    *   桌面端: `pnpm tauri dev`
4.  **代码规范与格式化**:
    *   本项目使用 [Biome](https://biomejs.dev/)。请在提交代码前执行 `pnpm fmt`。

### 🏗️ 项目架构

*   `src/components`: UI 组件（使用 Radix UI 和 CSS Modules）。
*   `src/modules`: 核心业务逻辑，包括音频处理和插件系统。
*   `src/states`: 使用 Jotai 定义的全局状态。
*   `src-tauri`: 桌面端的后端代码（Rust）。
*   `locales`: 国际化翻译文件（通过 Crowdin 同步）。

### 🔌 插件开发

本工具支持基于 Extism 的 WASM 插件。
*   WASM 插件应针对 `wasm32-unknown-unknown` 目标进行编译。
*   具体 API 规范请参考 `PLUGIN.md`。
*   插件系统的实现位于 `src/modules/plugins`。

### 🌍 国际化 (i18n)

我们使用 `i18next` 进行翻译管理。
*   如果你想提供新的语言支持，请前往 [Crowdin 项目页面](https://crowdin.com/project/very-cool-ttml-tool)。
*   本地测试可以修改 `locales/` 下的文件。

---

## 🤝 Workflow | 贡献流程

1.  **Fork** 仓库并创建你的功能分支 (`git checkout -b feature/AmazingFeature`)。
2.  **Commit** 你的修改 (`git commit -m 'Add some AmazingFeature'`)。
3.  **Push** 到分支 (`git push origin feature/AmazingFeature`)。
4.  提交 **Pull Request**。

请确保你的 PR 描述清晰，并附带相关的截图或测试结果（如果是 UI 改动）。
