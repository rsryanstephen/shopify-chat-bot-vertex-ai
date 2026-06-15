import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<div [class]="'bubble ' + message.role"><span *ngIf="message.role === 'ai'" class="avatar">🤖</span><p>{{ message.content }}</p></div>`,
  styleUrls: ['./message-bubble.component.css'],
})
export class MessageBubbleComponent {
  @Input() message!: { role: 'user' | 'ai'; content: string };
}
