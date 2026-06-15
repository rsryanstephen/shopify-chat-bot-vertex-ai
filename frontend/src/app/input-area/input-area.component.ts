import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-bar">
      <textarea #ta [(ngModel)]="localInput" (ngModelChange)="onInputChange($event)" (keydown)="onKeyDown($event)" (input)="autoGrow(ta)" [disabled]="isLoading" placeholder="Ask something..." rows="1"></textarea>
      <button class="send-btn" (click)="send.emit()" [disabled]="isLoading || !localInput.trim()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>
  `,
  styleUrls: ['./input-area.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class InputAreaComponent implements OnChanges {
  @Input() isLoading: boolean = false;
  @Input() userInput: string = '';
  @Output() userInputChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();

  @ViewChild('ta') ta!: ElementRef<HTMLTextAreaElement>;

  localInput = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInput']) {
      this.localInput = this.userInput;
      if (this.userInput === '' && this.ta) {
        this.ta.nativeElement.style.height = 'auto';
      }
    }
  }

  onInputChange(val: string): void {
    this.localInput = val;
    this.userInputChange.emit(val);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (this.localInput.trim()) this.send.emit();
    }
  }

  autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }
}
