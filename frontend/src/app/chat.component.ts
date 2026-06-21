import { Component, Input, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MessageAreaComponent } from './message-area/message-area.component';
import { InputAreaComponent } from './input-area/input-area.component';

@Component({
  selector: 'app-chatbot-ui',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MessageAreaComponent, InputAreaComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() pageContext: string = '';
  @Input() backendUrl: string = 'http://localhost:8000/api/chat';

  messages: { role: 'user' | 'ai', content: string }[] = [];
  userInput = '';
  isLoading = false;
  sidebarOpen = false;
  @Input() viewMode: 'app' | 'widget' = 'app';
  widgetOpen = false;
  toggleWidget(): void { this.widgetOpen = !this.widgetOpen; }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'app' ? 'widget' : 'app';
    this.widgetOpen = this.viewMode === 'widget';
  }
  private destroyed = false;
  // Replace: sessionId: string | null = null;
  // With a getter/setter that uses sessionStorage
  get sessionId(): string | null {
    return sessionStorage.getItem('chatbot_session_id');
  }
  set sessionId(value: string | null) {
    if (value) sessionStorage.setItem('chatbot_session_id', value);
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const saved = sessionStorage.getItem('chatbot_messages');
    if (saved) {
      this.messages = JSON.parse(saved);
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
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
                if (!this.destroyed) this.cdr.detectChanges();
              }
            }
          }
        }
      }
    } catch (e) {
      this.messages[aiMsgIndex].content = 'Error connecting to the server.';
    } finally {
      this.isLoading = false;
      if (!this.destroyed) this.cdr.detectChanges();
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
