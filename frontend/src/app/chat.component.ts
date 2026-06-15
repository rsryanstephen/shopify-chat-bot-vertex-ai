import { Component, Input, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MessageAreaComponent } from './message-area/message-area.component';
import { InputAreaComponent } from './input-area/input-area.component';

@Component({
  selector: 'app-chatbot-ui',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MessageAreaComponent, InputAreaComponent],
  template: `
    <div class="app-shell">
      <app-sidebar [isLoading]="isLoading" (newChat)="resetChat()" [class.open]="sidebarOpen"></app-sidebar>
      <div class="main-panel">
        <div class="mobile-header">
          <button class="hamburger" (click)="sidebarOpen = !sidebarOpen" aria-label="Toggle sidebar">☰</button>
        </div>
        <div class="content-col">
          <app-message-area [messages]="messages" [isLoading]="isLoading"></app-message-area>
          <app-input-area [isLoading]="isLoading" [userInput]="userInput"
            (userInputChange)="userInput = $event" (send)="sendMessage()"></app-input-area>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100vh; }
    .app-shell { display: flex; height: 100%; background: #f9f9fb; }
    app-sidebar { flex-shrink: 0; }
    .main-panel { flex: 1; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
    .mobile-header { display: none; }
    .hamburger { background: none; border: none; font-size: 22px; cursor: pointer; color: #18181b; }
    .content-col { width: 100%; max-width: 768px; display: flex; flex-direction: column; height: 100%; padding: 0 16px; }
    app-message-area { flex: 1; min-height: 0; }
    @media (max-width: 768px) {
      app-sidebar { position: absolute; top: 0; left: 0; height: 100%; z-index: 20; transform: translateX(-100%); transition: transform 0.2s ease; }
      app-sidebar.open { transform: translateX(0); }
      .mobile-header { display: flex; width: 100%; padding: 8px 12px; }
    }
  `],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class ChatComponent implements OnInit {
  @Input() pageContext: string = '';
  @Input() backendUrl: string = 'http://localhost:8000/api/chat';

  messages: { role: 'user' | 'ai', content: string }[] = [];
  userInput = '';
  isLoading = false;
  sidebarOpen = false;
  // Replace: sessionId: string | null = null;
  // With a getter/setter that uses sessionStorage
  get sessionId(): string | null {
    return sessionStorage.getItem('chatbot_session_id');
  }
  set sessionId(value: string | null) {
    if (value) sessionStorage.setItem('chatbot_session_id', value);
  }

  ngOnInit() {
    const saved = sessionStorage.getItem('chatbot_messages');
    if (saved) {
      this.messages = JSON.parse(saved);
    }
  }

  private saveMessages() {
    sessionStorage.setItem('chatbot_messages', JSON.stringify(this.messages));
  }

  async sendMessage() {
    if (!this.userInput.trim()) return;
    const prompt = this.userInput;
    this.messages.push({ role: 'user', content: prompt });
    this.messages = [...this.messages];
    this.userInput = '';
    this.isLoading = true;
    this.saveMessages();

    const aiMsgIndex = this.messages.push({ role: 'ai', content: '' }) - 1;
    this.messages = [...this.messages];

    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          page_context: this.pageContext,
          session_id: this.sessionId
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
              
              // Check if we received the full resource path session ID
              if (data.session_id && !this.sessionId) {
                this.sessionId = data.session_id; 
              }
              
              if (data.text) {
                this.messages[aiMsgIndex].content += data.text;
                this.messages = [...this.messages];
              }
            }
          }
        }
      }
    } catch (e) {
      this.messages[aiMsgIndex].content = 'Error connecting to the server.';
    } finally {
      this.isLoading = false;
      this.saveMessages();
    }
  }

  resetChat() {
    sessionStorage.removeItem('chatbot_session_id');
    sessionStorage.removeItem('chatbot_messages');
    this.messages = [];
    // This forces the backend to create a brand new conversation resource next time
  }

}
