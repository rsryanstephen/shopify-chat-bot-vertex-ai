import { Component, Input, ViewChild, ElementRef, AfterViewChecked, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';

@Component({
  selector: 'app-message-area',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `
    <div class="scroll-container" #scrollEl (scroll)="onScroll()">
      <div class="messages-wrapper">
        <app-message-bubble *ngFor="let msg of messages" [message]="msg"></app-message-bubble>
        <div *ngIf="isLoading" class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./message-area.component.css']
})
export class MessageAreaComponent implements AfterViewChecked {
  @Input() messages: { role: 'user' | 'ai', content: string }[] = [];
  @Input() isLoading: boolean = false;

  @ViewChild('scrollEl') scrollEl!: ElementRef;

  private atBottom = true;
  private prevScrollHeight = 0;

  onScroll(): void {
    const el = this.scrollEl.nativeElement;
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  ngAfterViewChecked(): void {
    const el = this.scrollEl.nativeElement;
    if (this.atBottom && el.scrollHeight > this.prevScrollHeight) {
      el.scrollTop = el.scrollHeight;
    }
    this.prevScrollHeight = el.scrollHeight;
  }
}
