// Load compatibility script
load("nashorn:mozilla_compat.js");
// Load Java classes
importClass(com.boomi.execution.ExecutionUtil);
importClass(java.io.ByteArrayInputStream);
importClass(java.util.Properties);
importClass(java.nio.charset.StandardCharsets);

try {
  // Document Loop
  for (var i = 0; i < dataContext.getDataCount(); i++) {
    var is = dataContext.getStream(i);
    var props = dataContext.getProperties(i);

    // Get Dynamic Document Property DDP_incoming_text
    var propValue = props.getProperty("document.dynamic.userdefined.DDP_incoming_text");

    // Check if the property is blank or null
    if (!propValue || propValue.trim() === "") {
      propValue = "default"; // Replace "default" with your desired default value
    }

    // Replace newlines and carriage returns with spaces
    propValue = propValue.replace(/[\r\n]+/g, ' ');

    // Get Dynamic Document Property DDP_max_characters or use default 1500
    var maxCharsValue = props.getProperty("document.dynamic.userdefined.DDP_max_characters");
    var MaxCharsPerChunk = 1500;
    if (!isNaN(maxCharsValue) && parseInt(maxCharsValue) >= 1) {
      MaxCharsPerChunk = parseInt(maxCharsValue);}

// Begin Chunking Logic
var title = "Your Title Here"; // Replace with your desired title or dynamic process property
var chunks = [];

// Splitting text function
function splitText() {
  for (var index = 0; index < propValue.length; index += MaxCharsPerChunk) {
    chunks.push({
      Start: index,
      End: index + MaxCharsPerChunk,
      Title: title,
      Text: propValue.slice(index, index + MaxCharsPerChunk),
    });
  }
}

if (MaxCharsPerChunk === 1 || !propValue.match(/[\.\!\?]/g)) {
  splitText();
} else {
  try {
    var sentences = propValue.match(/[^\.!\?]+[\.!\?]+/g);

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
            Start: chunkStart,
            End: chunkStart + chunkSentences,
            Title: title,
            Text: trimmedText,
          });
        }

        chunkStart += chunkSentences;
      }
    }
  } catch (e) {
    splitText();
  }
}

// Create separate documents for each chunk
for (var chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
  var chunk = chunks[chunkIndex];
  var chunkText = chunk.Text;
  var byteArray = new java.lang.String(chunkText).getBytes(StandardCharsets.UTF_8);
  var chunkStream = new ByteArrayInputStream(byteArray);

  // Set chunk.Text as the value for DDP_outgoing_text
  var outputProps = new java.util.Properties();
  outputProps.put("document.dynamic.userdefined.DDP_outgoing_text", chunkText);

  dataContext.storeStream(chunkStream, outputProps);
}

// End Chunking Logic
}
} catch (error) {
// Catch any unexpected errors
logger.severe("An error occurred during script execution: " + error);
}