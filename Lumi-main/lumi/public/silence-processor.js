class SilenceProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    let sum = 0;
    if (input) {
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i];
      }
      const rms = Math.sqrt(sum / input.length); // RMS value
      this.port.postMessage(rms);
    } else {
      this.port.postMessage(0);
    }
    return true;
  }
}

registerProcessor("silence-processor", SilenceProcessor);