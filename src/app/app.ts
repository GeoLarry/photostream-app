import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PhotoService } from './shared/services/photo.service';
import { Header } from './shared/components/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('photo-library-app');

  // private photoservise = inject(PhotoService);

  // async ngOnInit(): Promise<void> {
  //   try {
  //     const data = await this.photoservise.getRandomPhotos(15);
  //     console.log(data)
  //   } catch (error) {
  //     console.error('Something went wrong');
  //   }
  // }

}
