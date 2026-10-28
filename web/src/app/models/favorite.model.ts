// Mirrors api/src/Starter.Core/Contracts/FavoriteContracts.cs

export interface FavoriteResponse {
  photoId: string;
  author: string;
  width: number;
  height: number;
  url: string;
  downloadUrl: string;
  createdAtUtc: string;
}

// Body of PUT /api/favorites/{photoId}: the photo details kept with the favorite
export interface AddFavoriteRequest {
  author: string;
  width: number;
  height: number;
  url: string;
  downloadUrl: string;
}
