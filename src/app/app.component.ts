import { MarkerLabel } from '@agm/core';
import { animation } from '@angular/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GeocoderResponse } from './models/geocoder-response.model';
import { GeocodingService } from './services/geocoding.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  
  title = 'angular-maps-test';
  formGroup!: FormGroup;
  
  mapCenter: google.maps.LatLng = new google.maps.LatLng(51.678418, 7.809007);
  mapOptions: google.maps.MapOptions = {
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 20,
    minZoom: 4
  };
  //Pour permettre l'affichage de plusieurs marqueurs
  markers: google.maps.Marker[] = [];
  markerOptions: google.maps.MarkerOptions = {};

  markerInfoContent?: string;

  geoLocationWorking: boolean;
  formattedAddress?: string | null = null;
  locationCoords?: google.maps.LatLng | null = null;

  @ViewChild(GoogleMap, {static : false}) map!: GoogleMap;
  @ViewChild(MapMarker, {static : false}) mapMarker!: MapMarker;
  @ViewChild(MapInfoWindow, {static : false}) infoWindow!: MapInfoWindow;
  constructor(private fb: FormBuilder, private geoCodingService : GeocodingService, private _snackBar: MatSnackBar) {
    this.formGroup = this.fb.group({
      address: ["", [Validators.required]]
    });
    this.geoLocationWorking = false;
  }

  ngOnInit(): void {
    this.MyPosition();
  }

  get isWorking(): boolean {
    return this.geoLocationWorking;
  }
  /**
   * Interroge l'api google pour récupérer lat/lng de l'adresse en clair.
   */
  public onSubmit(): void {
    if (this.formGroup.invalid) return;
    const address = this.formGroup.get("address")?.value;
    console.log(`submitted ${address} of length ${address.length}`);
    this.geoLocationWorking = true;
    this.geoCodingService
      .getLocation(address)
      .subscribe(
        {
          next: (response: GeocoderResponse) => {
            if( response.status === "OK" && response.results?.length) {
              const location = response.results[0];
              const loc: any = location.geometry.location;
  
              this.locationCoords = new google.maps.LatLng(loc.lat, loc.lng);
  
              this.mapCenter = location.geometry.location; //Centre la map sur les coordonnées obtenues
  
              setTimeout(() => {
                if (this.map != undefined) {
                  this.map.panTo(location.geometry.location);
                }
              }, 500);
  
              this.markerInfoContent = location.formatted_address;
              this.markerOptions = {
                draggable: false,
                animation: google.maps.Animation.DROP,
                title: "info-bulle prix etc"
              };
            } else {
              this._snackBar.open(response.error_message, "OK");
            }
          },
          error: (e: HttpErrorResponse) => {
            console.error("Erreur du geocoder : ", e);
          },
          complete: () => {}
        })
        .add(() => this.geoLocationWorking = false); //teardown final
    }

  public test(event: google.maps.MapMouseEvent) {
    console.log("survol "+event.latLng);
    this.openInfo(this.mapMarker);
  }

  /**
   * Ouvre une fenêtre d'information au dessus du marker
   * @param marker le marker cliqué / survolé etc
   */
  public openInfo(marker: MapMarker): void {
    if(this.markerInfoContent) this.infoWindow.open(marker);
    //this._snackBar.open("marker clicked", "OK");
    console.log(`marker clicked, content ${this.markerInfoContent}`);
  }
  
  /**
   * Demande au navigateur votre position
   */
  public MyPosition(): void {
    navigator.geolocation.getCurrentPosition((position) => {
      this.mapCenter = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      this.markerOptions = {
        draggable: false,
        animation: google.maps.Animation.DROP,
        title: "Votre position actuelle"
      };
    });
  }

  private infoAnnonce(title: string, subtitle: string, price: string, picture: string): string {
    const s: string = `
    <table>
      <tr>
        <td><img src="${picture}" width="180"></td>
        <td>
          <h1>${title}</h1>
          <h3>${subtitle}</h3>
          ${price}
        </td>
      </tr>
    </table>`
    return s;
  }

  public Lille() {
    //this.markerInfoContent = "<div>Nous sommes à <b>Lille</b><div>";
    this.markerInfoContent = this.infoAnnonce("Studio 1 pièce 20m²", "Lille 59000", "300€/mois charges comprises", "");
    let text: string = "  ".repeat(4) + "300€";
    let label: MarkerLabel = {
      text: text,
      color: "white",
      fontFamily: "default",
      fontSize: "default",
      fontWeight: "600"
    }

    this.markerOptions = {
      title: "Au survol de lille\nEn plein centre-ville",
      label: label,
      icon: "https://nsm09.casimages.com/img/2022/04/01/22040102473315960417851111.png",
    }
    this.mapCenter = new google.maps.LatLng({lat: 50.62925, lng: 3.057256});
  }

  public Marseille(): void {
    this.markerInfoContent = this.infoAnnonce("Appartement 3 pièces 50m²", "Marseille", "675.000€", "https://nsm09.casimages.com/img/2022/04/01/22040104520915960417851182.jpg")
    let text: string = "  ".repeat(4) + "675k";
    let label: MarkerLabel = {
      text: text,
      color: "white",
      fontFamily: "default",
      fontSize: "default",
      fontWeight: "600"
    }

    this.markerOptions = {
      title: "Près du vieux port",
      label: label,
      icon: "https://nsm09.casimages.com/img/2022/04/01/22040104455715960417851180.png",
    }
    this.mapCenter = new google.maps.LatLng({lat: 43.296482, lng: 5.36978});
  }

  public Paris() {
    this.mapCenter = new google.maps.LatLng({lat: 48.856614, lng: 2.3522219});
  }

}
