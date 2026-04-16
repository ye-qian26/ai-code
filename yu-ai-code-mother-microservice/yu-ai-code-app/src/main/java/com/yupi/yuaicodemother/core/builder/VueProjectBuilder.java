package com.yupi.yuaicodemother.core.builder;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * 构建 Vue 项目
 */
@Slf4j
@Component
public class VueProjectBuilder {

    private static final List<String> VITE_CONFIG_FILES = List.of(
            "vite.config.js",
            "vite.config.ts",
            "vite.config.mjs"
    );
    private static final Pattern NODE_URL_IMPORT_PATTERN =
            Pattern.compile("import\\s*\\{[^}]*}\\s*from\\s*['\"]node:url['\"]");
    private static final Pattern FILE_URL_TO_PATH_IMPORT_PATTERN =
            Pattern.compile("import\\s*\\{[^}]*\\bfileURLToPath\\b[^}]*}\\s*from\\s*['\"]node:url['\"]");
    private static final Pattern URL_IMPORT_PATTERN =
            Pattern.compile("import\\s*\\{[^}]*\\bURL\\b[^}]*}\\s*from\\s*['\"]node:url['\"]");

    public record BuildResult(boolean success, String output) {
    }

    public void buildProjectAsync(String projectPath) {
        Thread.ofVirtual().name("vue-builder-" + System.currentTimeMillis())
                .start(() -> {
                    try {
                        buildProject(projectPath);
                    } catch (Exception e) {
                        log.error("异步构建 Vue 项目失败: {}", e.getMessage(), e);
                    }
                });
    }

    public boolean buildProject(String projectPath) {
        return buildProjectWithResult(projectPath).success();
    }

    public BuildResult buildProjectWithResult(String projectPath) {
        File projectDir = new File(projectPath);
        if (!projectDir.exists() || !projectDir.isDirectory()) {
            return new BuildResult(false, "项目目录不存在: " + projectPath);
        }

        File packageJsonFile = new File(projectDir, "package.json");
        if (!packageJsonFile.exists()) {
            return new BuildResult(false, "项目目录中缺少 package.json: " + projectPath);
        }

        normalizeProjectFiles(projectDir);

        log.info("开始构建 Vue 项目: {}", projectPath);
        CommandResult installResult = executeCommand(projectDir, buildCommand("npm") + " install", 300);
        if (!installResult.success()) {
            return new BuildResult(false, buildFailureMessage("npm install", installResult.output()));
        }

        CommandResult buildResult = executeCommand(projectDir, buildCommand("npm") + " run build", 180);
        if (!buildResult.success()) {
            return new BuildResult(false, buildFailureMessage("npm run build", buildResult.output()));
        }

        File distDir = new File(projectDir, "dist");
        if (!distDir.exists() || !distDir.isDirectory()) {
            return new BuildResult(false, "构建完成但未生成 dist 目录");
        }

        return new BuildResult(true, trimOutput(buildResult.output()));
    }

    private void normalizeProjectFiles(File projectDir) {
        for (String fileName : VITE_CONFIG_FILES) {
            File viteConfigFile = new File(projectDir, fileName);
            if (!viteConfigFile.exists() || !viteConfigFile.isFile()) {
                continue;
            }
            String content = FileUtil.readString(viteConfigFile, StandardCharsets.UTF_8);
            if (needsNodeUrlImport(content)) {
                String normalizedContent = normalizeNodeUrlImport(content);
                FileUtil.writeString(normalizedContent, viteConfigFile, StandardCharsets.UTF_8);
                log.info("已自动补充 node:url 导入: {}", viteConfigFile.getAbsolutePath());
            }
        }
    }

    private boolean needsNodeUrlImport(String content) {
        if (StrUtil.isBlank(content)) {
            return false;
        }
        boolean needsFileURLToPath = content.contains("fileURLToPath(")
                && !FILE_URL_TO_PATH_IMPORT_PATTERN.matcher(content).find();
        boolean needsUrl = content.contains("new URL(")
                && !URL_IMPORT_PATTERN.matcher(content).find();
        return needsFileURLToPath || needsUrl;
    }

    private String normalizeNodeUrlImport(String content) {
        String importLine = "import { fileURLToPath, URL } from 'node:url'";
        if (NODE_URL_IMPORT_PATTERN.matcher(content).find()) {
            return NODE_URL_IMPORT_PATTERN.matcher(content).replaceFirst(importLine);
        }
        return importLine + "\n" + content;
    }

    private String buildFailureMessage(String command, String output) {
        return command + " failed.\n" + trimOutput(output);
    }

    private String trimOutput(String output) {
        if (StrUtil.isBlank(output)) {
            return "";
        }
        int maxLength = 6000;
        if (output.length() <= maxLength) {
            return output;
        }
        return "[truncated]\n" + output.substring(output.length() - maxLength);
    }

    private String buildCommand(String baseCommand) {
        if (isWindows()) {
            return baseCommand + ".cmd";
        }
        return baseCommand;
    }

    private boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("windows");
    }

    private CommandResult executeCommand(File workingDir, String command, int timeoutSeconds) {
        try {
            log.info("在目录 {} 中执行命令: {}", workingDir.getAbsolutePath(), command);
            ProcessBuilder processBuilder = new ProcessBuilder(command.split("\\s+"));
            processBuilder.directory(workingDir);
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            StringBuilder output = new StringBuilder();
            Thread outputReader = Thread.startVirtualThread(() -> readProcessOutput(process, output));

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                outputReader.join(1000);
                return new CommandResult(false, "Command timed out after " + timeoutSeconds + " seconds");
            }

            outputReader.join(1000);
            int exitCode = process.exitValue();
            String commandOutput = output.toString();
            if (exitCode == 0) {
                log.info("命令执行成功: {}", command);
                return new CommandResult(true, commandOutput);
            }

            log.error("命令执行失败，退出码: {}", exitCode);
            if (StrUtil.isNotBlank(commandOutput)) {
                log.error("命令输出:\n{}", commandOutput);
            }
            return new CommandResult(false, commandOutput);
        } catch (Exception e) {
            log.error("执行命令失败: {}, 错误信息: {}", command, e.getMessage(), e);
            return new CommandResult(false, e.getMessage());
        }
    }

    private void readProcessOutput(Process process, StringBuilder output) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append(System.lineSeparator());
            }
        } catch (Exception e) {
            log.warn("读取命令输出失败: {}", e.getMessage());
        }
    }

    private record CommandResult(boolean success, String output) {
    }
}
