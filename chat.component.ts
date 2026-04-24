import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chatbot-ui',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chatbot-wrapper">
      <div class="chat-history">
        <div *ngFor="let msg of messages" [class]="'msg-' + msg.role">
          <strong>{{ msg.role === 'user' ? 'You' : 'AI' }}:</strong>
          <span>{{ msg.content }}</span>
        </div>
      </div>
      <div class="chat-input">
        <input [(ngModel)]="userInput" (keyup.enter)="sendMessage()" placeholder="Ask something..." [disabled]="isLoading" />
        <button (click)="sendMessage()" [disabled]="isLoading || !userInput.trim()">Send</button>
      </div>
    </div>
  `,
  styles: [`
    .chatbot-wrapper { font-family: sans-serif; border: 1px solid #ddd; border-radius: 8px; padding: 16px; background: #fff; max-width: 100%; height: 500px; display: flex; flex-direction: column; }
    .chat-history { flex: 1; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    .msg-user { align-self: flex-end; background: #e0f7fa; padding: 8px; border-radius: 8px; }
    .msg-ai { align-self: flex-start; background: #f5f5f5; padding: 8px; border-radius: 8px; }
    .chat-input { display: flex; gap: 8px; }
    .chat-input input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .chat-input button { padding: 8px 16px; cursor: pointer; }
  `],
  // Disable encapsulation so the web component CSS works reliably in host environments
  encapsulation: ViewEncapsulation.ShadowDom 
})
export class ChatComponent {
  // Add an Input property to receive data from Shopify
  @Input() pageContext: string = '';

  messages: { role: 'user' | 'ai', content: string }[] = [];
  userInput = '';
  isLoading = false;
  backendUrl = 'http://localhost:8000/api/chat'; // Update dynamically in production

  async sendMessage() {
    if (!this.userInput.trim()) return;
    const prompt = this.userInput;
    this.messages.push({ role: 'user', content: prompt });
    this.userInput = '';
    this.isLoading = true;

    const aiMsgIndex = this.messages.push({ role: 'ai', content: '' }) - 1;

    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          // Pass the context to the backend
          page_context: this.pageContext 
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) this.messages[aiMsgIndex].content += data.text;
            }
          }
        }
      }
    } catch (e) {
      this.messages[aiMsgIndex].content = 'Error connecting to the server.';
    } finally {
      this.isLoading = false;
    }
  }
}