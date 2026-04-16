package com.yupi.yuaicodemother.core.builder;

import cn.hutool.core.util.StrUtil;
import com.yupi.yuaicodemother.ai.AiCodeGeneratorService;
import com.yupi.yuaicodemother.ai.AiCodeGeneratorServiceFactory;
import com.yupi.yuaicodemother.model.enums.CodeGenTypeEnum;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

/**
 * Vue 项目构建与自动修复服务
 */
@Slf4j
@Component
public class VueProjectBuildService {

    private static final int MAX_REPAIR_ATTEMPTS = 2;

    @Resource
    private VueProjectBuilder vueProjectBuilder;

    @Resource
    private AiCodeGeneratorServiceFactory aiCodeGeneratorServiceFactory;

    public VueProjectBuilder.BuildResult ensureProjectBuildReady(long appId, String projectPath) {
        return ensureProjectBuildReady(appId, projectPath, null);
    }

    public VueProjectBuilder.BuildResult ensureProjectBuildReady(long appId,
                                                                 String projectPath,
                                                                 Consumer<String> statusConsumer) {
        VueProjectBuilder.BuildResult buildResult = vueProjectBuilder.buildProjectWithResult(projectPath);
        if (buildResult.success()) {
            return buildResult;
        }

        AiCodeGeneratorService aiCodeGeneratorService =
                aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(appId, CodeGenTypeEnum.VUE_PROJECT);

        for (int attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS && !buildResult.success(); attempt++) {
            notifyStatus(statusConsumer, attempt == 1
                    ? "检测到 Vue 项目构建错误，正在自动修复并重试...\n"
                    : "上一次自动修复后仍未通过构建，正在继续修复...\n");

            String repairPrompt = buildRepairPrompt(buildResult.output(), attempt);
            String repairSummary = aiCodeGeneratorService.repairVueProjectBuild(appId, repairPrompt);
            if (StrUtil.isNotBlank(repairSummary)) {
                log.info("Vue 项目自动修复结果(appId={}, attempt={}): {}", appId, attempt, repairSummary);
            }

            buildResult = vueProjectBuilder.buildProjectWithResult(projectPath);
        }

        return buildResult;
    }

    private void notifyStatus(Consumer<String> statusConsumer, String message) {
        if (statusConsumer != null && StrUtil.isNotBlank(message)) {
            statusConsumer.accept(message);
        }
    }

    private String buildRepairPrompt(String buildOutput, int attempt) {
        String normalizedOutput = StrUtil.blankToDefault(buildOutput, "No build output was captured.");
        return """
                The current Vue project failed to build.
                Repair attempt: %d

                Requirements:
                - Fix the existing project in place.
                - Make the smallest safe changes needed for the build to pass.
                - Inspect files before editing them.
                - Prefer targeted syntax/import/config fixes over rewrites.
                - Call the exit tool after finishing.

                Build output:
                %s
                """.formatted(attempt, normalizedOutput);
    }
}
