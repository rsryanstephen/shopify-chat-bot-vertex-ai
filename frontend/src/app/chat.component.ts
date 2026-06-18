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
  template: `
    <ng-container>
      <button *ngIf="viewMode==='widget' && !widgetOpen" class="widget-fab" (click)="toggleWidget()" aria-label="Open chat">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3C6.48 3 2 6.94 2 11.5c0 2.08.95 3.97 2.5 5.41V21l3.74-2.05c1.16.36 2.42.55 3.76.55 5.52 0 10-3.94 10-8.5S17.52 3 12 3z" fill="currentColor"/>
        </svg>
      </button>
      <div class="app-shell" *ngIf="viewMode==='app' || widgetOpen"
        [class.widget-mode]="viewMode==='widget'" [class.widget-open]="widgetOpen">
        <app-sidebar *ngIf="viewMode==='app'" [isLoading]="isLoading" (newChat)="resetChat()" [class.open]="sidebarOpen"></app-sidebar>
        <button *ngIf="viewMode==='app'" class="mode-switch" (click)="toggleViewMode()" aria-label="Switch to widget mode" title="Switch to widget mode">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="4" x2="10" y2="10"/>
            <polyline points="10 5 10 10 5 10"/>
            <line x1="20" y1="20" x2="14" y2="14"/>
            <polyline points="14 19 14 14 19 14"/>
          </svg>
        </button>
        <div class="main-panel">
          <div *ngIf="viewMode==='widget'" class="widget-header">
            <span class="bot-name">Danntech Assistant</span>
            <span class="status-dot"></span>
            <span class="status-label">Online</span>
            <button class="mode-switch-back" (click)="toggleViewMode()" aria-label="Switch to full-screen mode" title="Switch to full-screen mode">⤢</button>
            <button class="widget-close" (click)="toggleWidget()">✕</button>
          </div>
          <div *ngIf="viewMode==='widget'" class="widget-clear-row">
            <button class="widget-clear-btn" (click)="resetChat()" [disabled]="isLoading" aria-label="Clear chat" title="Clear chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div *ngIf="viewMode==='app'" class="mobile-header">
            <button class="hamburger" (click)="sidebarOpen = !sidebarOpen" aria-label="Toggle sidebar">☰</button>
          </div>
          <div class="content-col">
            <app-message-area [messages]="messages" [isLoading]="isLoading"></app-message-area>
            <div class="input-row">
              <button *ngIf="viewMode==='app'" class="clear-btn" (click)="resetChat()" [disabled]="isLoading">Clear Chat</button>
              <app-input-area [isLoading]="isLoading" [userInput]="userInput"
                (userInputChange)="userInput = $event" (send)="sendMessage()"></app-input-area>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100vh; }
    .widget-fab {}
    .widget-mode {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 380px;
      height: 600px;
      max-height: 85vh;
      max-width: 90vw;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }
    .widget-clear-row { position: absolute; top: 8px; left: 8px; z-index: 5; display: flex; padding: 0; }
    .widget-clear-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; padding: 0;
      border: 1px solid #9a9a9f; border-radius: 6px;
      cursor: pointer; color: #3a3a40;
      background: linear-gradient(180deg, #fdfdfe 0%, #e6e6ea 45%, #c9c9d0 55%, #d8d8de 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.25);
    }
    .widget-clear-btn:hover:not(:disabled) { background: linear-gradient(180deg, #ffffff 0%, #ededf1 45%, #d2d2d9 55%, #e0e0e6 100%); }
    .widget-clear-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .widget-header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; flex-shrink: 0; }
    .bot-name { font-size: 14px; font-weight: 600; color: #18181b; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
    .status-label { font-size: 12px; color: #6b7280; margin-right: auto; }
    .widget-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #6b7280; padding: 0; }
    .mode-switch {
      position: fixed; top: 16px; right: 16px; z-index: 40;
      display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid #9a9a9f; border-radius: 6px; padding: 6px;
      cursor: pointer; color: #3a3a40;
      background: linear-gradient(180deg, #fdfdfe 0%, #e6e6ea 45%, #c9c9d0 55%, #d8d8de 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.25);
    }
    .mode-switch:hover { background: linear-gradient(180deg, #ffffff 0%, #ededf1 45%, #d2d2d9 55%, #e0e0e6 100%); }
    .mode-switch-back { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
    .app-shell { display: flex; height: 100%; background: #f9f9fb; }
    app-sidebar { flex-shrink: 0; }
    .main-panel { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
    .mobile-header { display: none; }
    .hamburger { background: none; border: none; font-size: 22px; cursor: pointer; color: #18181b; }
    .content-col { width: 100%; max-width: 768px; display: flex; flex-direction: column; height: 100%; padding: 0 16px; }
    .input-row { display: flex; align-items: flex-end; gap: 8px; }
    .input-row app-input-area { flex: 1; min-width: 0; }
    .input-row .clear-btn { flex-shrink: 0; align-self: center; }
    .clear-btn {
      border: 1px solid #9a9a9f;
      border-radius: 6px;
      padding: 5px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: #3a3a40;
      background: linear-gradient(180deg, #fdfdfe 0%, #e6e6ea 45%, #c9c9d0 55%, #d8d8de 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.25);
      text-shadow: 0 1px 0 rgba(255,255,255,0.7);
      transition: box-shadow 0.1s ease, background 0.1s ease;
      margin-bottom: 12px;
    }
    .clear-btn:hover:not(:disabled) { background: linear-gradient(180deg, #ffffff 0%, #ededf1 45%, #d2d2d9 55%, #e0e0e6 100%); }
    .clear-btn:active:not(:disabled) {
      background: linear-gradient(180deg, #c9c9d0 0%, #d8d8de 55%, #e6e6ea 100%);
      box-shadow: inset 0 2px 3px rgba(0,0,0,0.25), 0 1px 1px rgba(0,0,0,0.15);
    }
    .clear-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    app-message-area { flex: 1; min-height: 0; }
    @media (max-width: 768px) {
      app-sidebar { position: absolute; top: 0; left: 0; height: 100%; z-index: 20; transform: translateX(-100%); transition: transform 0.2s ease; }
      app-sidebar.open { transform: translateX(0); }
      .mobile-header { display: flex; width: 100%; padding: 8px 12px; position: relative; z-index: 30; }
    }
  `],
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
