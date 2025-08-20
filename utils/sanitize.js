import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty);
};