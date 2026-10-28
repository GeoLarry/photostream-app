import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

const MaterialModules = [
  MatToolbarModule,
  MatButtonModule,
  MatGridListModule,
  MatProgressSpinnerModule,
  MatCardModule,
  MatIconModule,
  MatSnackBarModule
];

@NgModule({
  imports: [MaterialModules],
  exports: [MaterialModules]
})

export class MaterialModule { }
