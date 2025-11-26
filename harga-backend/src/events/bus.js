// src/events/bus.js
import { EventEmitter } from 'events';
export const bus = new EventEmitter();
bus.setMaxListeners(100);
