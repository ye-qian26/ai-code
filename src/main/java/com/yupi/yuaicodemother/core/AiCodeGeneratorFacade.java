package com.yupi.yuaicodemother.core;

import cn.hutool.json.JSONUtil;
import com.yupi.yuaicodemother.ai.AiCodeGeneratorService;
import com.yupi.yuaicodemother.ai.AiCodeGeneratorServiceFactory;
import com.yupi.yuaicodemother.ai.model.HtmlCodeResult;
import com.yupi.yuaicodemother.ai.model.MultiFileCodeResult;
import com.yupi.yuaicodemother.ai.model.message.AiResponseMessage;
import com.yupi.yuaicodemother.ai.model.message.StreamErrorMessage;
import com.yupi.yuaicodemother.ai.model.message.ToolExecutedMessage;
import com.yupi.yuaicodemother.ai.model.message.ToolRequestMessage;
import com.yupi.yuaicodemother.core.builder.VueProjectBuilder;
import com.yupi.yuaicodemother.core.builder.VueProjectPathResolver;
import com.yupi.yuaicodemother.core.builder.VueProjectScaffolder;
import com.yupi.yuaicodemother.core.parser.CodeParserExecutor;
import com.yupi.yuaicodemother.core.saver.CodeFileSaverExecutor;
import com.yupi.yuaicodemother.exception.BusinessException;
import com.yupi.yuaicodemother.exception.ErrorCode;
import com.yupi.yuaicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.service.TokenStream;
import dev.langchain4j.service.tool.ToolExecution;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.io.File;

@Service
@Slf4j
public class AiCodeGeneratorFacade {

    @Resource
    private AiCodeGeneratorServiceFactory aiCodeGeneratorServiceFactory;

    @Resource
    private VueProjectBuilder vueProjectBuilder;

    @Resource
    private VueProjectScaffolder vueProjectScaffolder;

    @Resource
    private VueProjectPathResolver vueProjectPathResolver;

    public File generateAndSaveCode(String userMessage, CodeGenTypeEnum codeGenTypeEnum, Long appId) {
        if (codeGenTypeEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Code generation type is required");
        }
        AiCodeGeneratorService aiCodeGeneratorService =
                aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(appId, codeGenTypeEnum);
        return switch (codeGenTypeEnum) {
            case HTML -> {
                HtmlCodeResult result = aiCodeGeneratorService.generateHtmlCode(userMessage);
                yield CodeFileSaverExecutor.executeSaver(result, CodeGenTypeEnum.HTML, appId);
            }
            case MULTI_FILE -> {
                MultiFileCodeResult result = aiCodeGeneratorService.generateMultiFileCode(userMessage);
                yield CodeFileSaverExecutor.executeSaver(result, CodeGenTypeEnum.MULTI_FILE, appId);
            }
            default -> throw new BusinessException(
                    ErrorCode.SYSTEM_ERROR,
                    "Unsupported code generation type: " + codeGenTypeEnum.getValue()
            );
        };
    }

    public Flux<String> generateAndSaveCodeStream(String userMessage, CodeGenTypeEnum codeGenTypeEnum, Long appId) {
        if (codeGenTypeEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Code generation type is required");
        }
        AiCodeGeneratorService aiCodeGeneratorService =
                aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(appId, codeGenTypeEnum);
        return switch (codeGenTypeEnum) {
            case HTML -> processCodeStream(
                    aiCodeGeneratorService.generateHtmlCodeStream(userMessage),
                    CodeGenTypeEnum.HTML,
                    appId
            );
            case MULTI_FILE -> processCodeStream(
                    aiCodeGeneratorService.generateMultiFileCodeStream(userMessage),
                    CodeGenTypeEnum.MULTI_FILE,
                    appId
            );
            case VUE_PROJECT -> Flux.defer(() -> {
                try {
                    TokenStream tokenStream = aiCodeGeneratorService.generateVueProjectCodeStream(appId, userMessage);
                    return processTokenStream(tokenStream, appId);
                } catch (Exception e) {
                    log.error("Failed to start Vue project generation for appId={}", appId, e);
                    return Flux.just(buildStreamErrorChunk("stream_start", buildUserFacingMessage(e), true));
                }
            });
            default -> throw new BusinessException(
                    ErrorCode.SYSTEM_ERROR,
                    "Unsupported code generation type: " + codeGenTypeEnum.getValue()
            );
        };
    }

    private Flux<String> processTokenStream(TokenStream tokenStream, Long appId) {
        return Flux.create(sink -> {
            try {
                vueProjectScaffolder.prepareProject(appId);
            } catch (Exception e) {
                log.error("Failed to prepare Vue project scaffold for appId={}", appId, e);
                sink.next(buildStreamErrorChunk("scaffold", "项目初始化失败，请稍后重试", true));
                sink.complete();
                return;
            }

            tokenStream.onPartialResponse(partialResponse -> {
                        AiResponseMessage aiResponseMessage = new AiResponseMessage(partialResponse);
                        sink.next(JSONUtil.toJsonStr(aiResponseMessage));
                    })
                    .onPartialToolExecutionRequest((index, toolExecutionRequest) -> {
                        ToolRequestMessage toolRequestMessage = new ToolRequestMessage(toolExecutionRequest);
                        sink.next(JSONUtil.toJsonStr(toolRequestMessage));
                    })
                    .onToolExecuted((ToolExecution toolExecution) -> {
                        ToolExecutedMessage toolExecutedMessage = new ToolExecutedMessage(toolExecution);
                        sink.next(JSONUtil.toJsonStr(toolExecutedMessage));
                    })
                    .onCompleteResponse((ChatResponse response) -> {
                        String projectPath = vueProjectPathResolver.resolveProjectRoot(appId).toString();
                        if (!vueProjectBuilder.buildProject(projectPath)) {
                            sink.next(buildStreamErrorChunk("build", "代码已生成，但项目构建失败，请根据提示继续修复", false));
                            sink.complete();
                            return;
                        }
                        sink.complete();
                    })
                    .onError(error -> {
                        log.error("Vue project generation failed for appId={}", appId, error);
                        sink.next(buildStreamErrorChunk("streaming", buildUserFacingMessage(error), isRetryable(error)));
                        sink.complete();
                    })
                    .start();
        });
    }

    private Flux<String> processCodeStream(Flux<String> codeStream, CodeGenTypeEnum codeGenType, Long appId) {
        StringBuilder codeBuilder = new StringBuilder();
        return codeStream.doOnNext(codeBuilder::append)
                .doOnComplete(() -> {
                    try {
                        String completeCode = codeBuilder.toString();
                        Object parsedResult = CodeParserExecutor.executeParser(completeCode, codeGenType);
                        File saveDir = CodeFileSaverExecutor.executeSaver(parsedResult, codeGenType, appId);
                        log.info("Code generated and saved successfully: {}", saveDir.getAbsolutePath());
                    } catch (Exception e) {
                        log.error("Failed to save generated code", e);
                    }
                });
    }

    private String buildStreamErrorChunk(String stage, String message, boolean retryable) {
        StreamErrorMessage streamErrorMessage = new StreamErrorMessage(
                stage,
                ErrorCode.SYSTEM_ERROR.getCode(),
                message,
                retryable,
                true,
                true
        );
        return JSONUtil.toJsonStr(streamErrorMessage);
    }

    private String buildUserFacingMessage(Throwable error) {
        if (isRetryable(error)) {
            return "会话服务暂时不可用，本次生成已中断，请稍后重试";
        }
        String errorMessage = error.getMessage();
        if (errorMessage == null || errorMessage.isBlank()) {
            return "生成过程中出现系统异常，请稍后重试";
        }
        return errorMessage;
    }

    private boolean isRetryable(Throwable error) {
        Throwable current = error;
        while (current != null) {
            String className = current.getClass().getName();
            if (className.contains("JedisConnectionException")
                    || className.contains("SocketException")
                    || className.contains("ConnectException")
                    || className.contains("TimeoutException")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
