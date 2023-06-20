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

    // Append XYZ to the retrieved value
    var newValue = propValue + "XYZ";

    // Set a Dynamic Document Property DDP_outgoing_text to the modified value
    props.setProperty("document.dynamic.userdefined.DDP_outgoing_text", newValue);

    dataContext.storeStream(is, props);
}
