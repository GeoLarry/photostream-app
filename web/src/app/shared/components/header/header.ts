import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../modules/mareial.module';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MaterialModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

}
