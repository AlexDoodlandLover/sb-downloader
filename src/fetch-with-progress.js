import fetch from 'cross-fetch';
import {AbortError, HTTPError} from './errors.js';

/**
 * @param {stirng} url
 * @param {(progress: number) => void} progressCallback
 * @param {AbortSignal} [abortSignal] 
 * @returns {Promise<ArrayBuffer>}
 */
const fetchAsArrayBufferWithProgress = (url, progressCallback, abortSignal) => {
  // We can't always track real progress, but we should still fire explicit 0% and 100% complete events.
  progressCallback(0);

  if (typeof XMLHttpRequest === 'function') {
    // Running in browsers. We can monitor progress using XHR.
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status === 200) {
          progressCallback(1);
          resolve(xhr.response);
        } else {
          reject(new HTTPError(url, xhr.status));
        }
      };
      xhr.onerror = () => {
        reject(new Error(`Failed to fetch ${url}: xhr error`));
      };
      xhr.onabort = () => {
        reject(new AbortError(`Failed to fetch ${url}: aborted`))
      };
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          progressCallback(e.loaded / e.total);
        }
      };
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
        });
      }
      xhr.responseType = 'arraybuffer';
      xhr.open('GET', url);
      xhr.send();
    });
  }

  // Running in Node.js. For now we just won't have progress monitoring.
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buffer) => {
      progressCallback(1);
      return buffer;
    });
};

export default fetchAsArrayBufferWithProgress;