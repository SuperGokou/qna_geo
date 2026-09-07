import { answer as coreAnswer } from '../shared/chat-core.js';
import { engine } from './retrieval.js';
export { RequestSchema } from '../shared/chat-core.js';
export const answer = (request, settings, signal, transport) => coreAnswer(request, settings, signal, transport, engine);
