// Load compatibility script
load("nashorn:mozilla_compat.js");
// Load Java classes
importClass(com.boomi.execution.ExecutionUtil);
importClass(java.util.Properties);

// Document Loop
for(var i = 0; i < dataContext.getDataCount(); i++ ) {
    var is = dataContext.getStream(i);
    var props = dataContext.getProperties(i);
    
    // Get Dynamic Document Property DDP_incoming_text
    var propValue = props.getProperty("document.dynamic.userdefined.DDP_incoming_text");
    
    // Check if the property is blank or null
    if(!propValue || propValue.trim() === '') {
        propValue = "default"; // Replace "default" with your desired default value
    }

    // Begin Chunking Logic
    var title = "Your Title Here"; // Replace with your desired title or dynamic process property
    var MaxCharsPerChunk = 1500;
    var chunks = [];

    try {
        // Attempt to split the text into sentences
        var sentences = propValue.match(/[^\.!\?]+[\.!\?]+/g);

        // If no sentences found, split by characters instead
        if (sentences == null) {
            for (var index = 0; index < propValue.length; index += MaxCharsPerChunk) {
                chunks.push({
                    Start: index,
                    End: index + MaxCharsPerChunk,
                    Title: title,
                    Text: propValue.slice(index, index + MaxCharsPerChunk)
                });
            }
        } else {
            // If sentences found, split with preference on sentences
            var chunkStart = 0;

            while (chunkStart < sentences.length) {
                var charCount = 0;
                var chunkText = "";
                var chunkSentences = 0;

                for (var j = chunkStart; j < sentences.length && charCount < MaxCharsPerChunk; j++) {
                    var sentence = sentences[j];
                    var sentenceCharCount = sentence.length;

                    if (sentenceCharCount > MaxCharsPerChunk) {
                        continue; // Skip sentence if longer than MaxCharsPerChunk.
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
                        Start: chunkStart,
                        End: chunkStart + chunkSentences,
                        Title: title,
                        Text: trimmedText
                    });
                }

                // Calculate stride dynamically based on chunk sentences.
                var sentenceStride = Math.floor(chunkSentences / 5);
                if (sentenceStride == 0) {
                    sentenceStride = 1;
                }

                // Move chunkStart forward by sentenceStride.
                chunkStart += sentenceStride;
            }
        }
    } catch (e) {
        // If an error occurs during splitting, split by characters instead
            for (var index = 0; index < propValue.length; index += MaxCharsPerChunk) {
                chunks.push({
                    Start: index,
                    End: index + MaxCharsPerChunk,
                    Title: title,
                    Text: propValue.slice(index, index + MaxCharsPerChunk)
                });
            }
    }

    if (chunks.length == 0) {
        logger.severe("No chunks created.");
    } else {
        // Set the chunks as a new value for DDP_outgoing_text.
        props.setProperty("document.dynamic.userdefined.DDP_outgoing_text", JSON.stringify(chunks));
    }

    // End Chunking Logic

    dataContext.storeStream(is, props);
}