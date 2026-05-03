import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { ChatComponent } from './app/chat.component';

(async () => {
  const app = await createApplication({ providers: [] });
  const chatElement = createCustomElement(ChatComponent, { injector: app.injector });
  customElements.define('chatbot-widget', chatElement);
})();
