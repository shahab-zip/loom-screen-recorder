import { createWidget } from './widget/widget';

let widget: ReturnType<typeof createWidget> | null = null;

chrome.runtime.onMessage.addListener((message: Record<string, unknown>) => {
  if (message.type === 'STATE_UPDATE' && 'state' in message) {
    const state = message.state as import('./shared/types').RecordingState;
    if (!widget && state.isRecording) {
      widget = createWidget();
    }
    widget?.updateState(state);
    if (!state.isRecording && widget) {
      widget.destroy();
      widget = null;
    }
  } else if (message.type === 'FINALIZE_RECORDING') {
    widget?.finalizeRecording();
  } else if (message.type === 'START_CAPTURE' && 'mode' in message) {
    if (!widget) widget = createWidget();
    widget.startCapture(message.mode as 'screen' | 'screen-camera');
  }
});

// Request initial state on load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  if (state?.isRecording) {
    widget = createWidget();
    widget.updateState(state);
  }
});
