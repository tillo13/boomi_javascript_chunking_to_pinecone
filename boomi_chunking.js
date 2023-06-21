load("nashorn:mozilla_compat.js");
importClass(com.boomi.execution.ExecutionUtil);
importClass(java.io.ByteArrayInputStream);
importClass(java.util.Properties);
importClass(java.nio.charset.StandardCharsets);

function escapeSlackJson(input) {
    input = input.replace(/["“”]/g, "'");
    input = input.replace(/[‘’]/g, "'");
    input = input.replace(/[—–]/g, "-");
    input = input.replace(/…/g, "...");
    return input.replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .replace(/\s+/g, ' ');
}

try {
    for (var i = 0; i < dataContext.getDataCount(); i++) {
        var is = dataContext.getStream(i);
        var props = dataContext.getProperties(i);

        var propValue = props.getProperty("document.dynamic.userdefined.DDP_incoming_text");

        if (!propValue || propValue.trim() === "") {
            propValue = "default";
        }

        propValue = escapeSlackJson(propValue);
        propValue = propValue.replace(/[\r\n]+/g, ' ');

        var maxCharsValue = props.getProperty("document.dynamic.userdefined.DDP_max_characters");
        var MaxCharsPerChunk = 1500;
        if (!isNaN(maxCharsValue) && parseInt(maxCharsValue) >= 1) {
            MaxCharsPerChunk = parseInt(maxCharsValue);
        }

        var chunks = [];

        function splitText() {
            for (var index = 0; index < propValue.length; index += MaxCharsPerChunk) {
                chunks.push({
                    model: "text-embedding-ada-002",
                    input: propValue.slice(index, index + MaxCharsPerChunk),
                });
            }
        }

        if (MaxCharsPerChunk === 1 || !propValue.match(/[.!?]/g)) {
            splitText();
        } else {
            try {
                var sentences = propValue.match(/[^.!?]+[.!?]+/g);

                if (sentences == null) {
                    splitText();
                } else {

                    var chunkStart = 0;
                    while (chunkStart < sentences.length) {
                        var charCount = 0;
                        var chunkText = "";
                        var chunkSentences = 0;

                        for (var j = chunkStart; j < sentences.length && charCount < MaxCharsPerChunk; j++) {
                            var sentence = sentences[j];
                            var sentenceCharCount = sentence.length;

                            if (sentenceCharCount > MaxCharsPerChunk) {
                                continue;
                            }

                            if (charCount + sentenceCharCount <= MaxCharsPerChunk) {
                                charCount += sentenceCharCount;
                                chunkText += " " + sentence;
                                chunkSentences++;
                            } else {
                                break;
                            }
                        }

                        var trimmedText = chunkText.trim();

                        if (trimmedText.length > 0) {
                            chunks.push({
                                model: "text-embedding-ada-002",
                                input: trimmedText,
                            });
                        }

                        chunkStart += chunkSentences;
                    }
                }
            } catch (e) {
                splitText();
            }
        }

        for (var chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            var chunk = chunks[chunkIndex];
            var jsonPayload = JSON.stringify(chunk);
            var byteArray = new java.lang.String(jsonPayload).getBytes(StandardCharsets.UTF_8);
            var chunkStream = new ByteArrayInputStream(byteArray);

            var outputProps = new java.util.Properties();
            outputProps.put("document.dynamic.userdefined.DDP_outgoing_text", jsonPayload);

            dataContext.storeStream(chunkStream, outputProps);
        }
    }
} catch (error) {
    logger.severe("An error occurred during script execution: " + error);
}