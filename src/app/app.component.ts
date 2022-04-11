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
  
  title = "angular-maps-test";
  formGroup!: FormGroup;

  iconHouse = "https://nsm09.casimages.com/img/2022/04/01/22040102473315960417851111.png";
  iconBuilding = "https://nsm09.casimages.com/img/2022/04/01/22040104455715960417851180.png";
  
  //Tour Eiffel au démarrage si geolocalisation interdite
  mapCenter: google.maps.LatLng = new google.maps.LatLng(48.858370, 2.294481);
  mapOptions: google.maps.MapOptions = {
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 20,
    minZoom: 4
  };
  //Pour permettre l'affichage de plusieurs marqueurs
  markers = [] as any;
  markersList = [] as any;

  markerInfoContent?: string;

  geoLocationWorking: boolean;
  formattedAddress?: string | null = null;
  locationCoords?: google.maps.LatLng | null = null;

  @ViewChild(GoogleMap, {static : false}) map!: GoogleMap;
  @ViewChild(MapInfoWindow, {static : false}) infoWindow!: MapInfoWindow;
  constructor(private fb: FormBuilder, private geoCodingService : GeocodingService, private _snackBar: MatSnackBar) {
    this.formGroup = this.fb.group({
      address: ["", [Validators.required]]
    });
    this.geoLocationWorking = false;
  }

  ngOnInit(): void {
    this.MyPosition();
    this.mockMarkers(20);
  }

  /**
   * Indique qu'une géolocalisation est en cours
   */
  get isWorking(): boolean {
    return this.geoLocationWorking;
  }

  /**
   * Ajoute un marqueur personnalisé sur la carte
   * @param lat la latitude (float)
   * @param lng la longitude (float)
   * @param price le prix de location/achat qui apparaîtra comme label du marqueur
   * @param icon l'icône utilisée (maison/appartement)
   * @param info les données de la fenêtre info (apparaît uniquement au survol)
   */
  public addMarker(lat: number, lng: number, price: string, icon: string, info: string): void {
    this.markersList.push({
      position: {
        lat: lat,
        lng: lng,
      },
      label: {
        color: 'white',
        fontWeight: "600",
        text: price,
      },
      info: info,
      icon: icon,
      options: {
        animation: google.maps.Animation.DROP,
      },
    })
  }

  /**
   * Pour test, ajoute un marqueur au hasard dans les environs du centre de la map
   */
  public addRandomMarker(): void {
    let n: number = this.markersList.length + 1;
    this.markersList.push({
      position: {
        lat: this.mapCenter.lat() + ((Math.random() - 0.5) * 2) / 10,
        lng: this.mapCenter.lng() + ((Math.random() - 0.5) * 2) / 10,
      },
      label: {
        color: "white",
        text: "Prix " + n,
        fontWeight: "600"
      },
      //title: 'Marker title ' + (this.markers.length + 1),
      info: this.infoAnnonce(`Titre annonce ${n}`, `Sous-titre annonce ${n}`, `Prix de location/vente`, "http://loremflickr.com/1024/600/house"),
      icon: this.iconBuilding,
      options: {
        animation: google.maps.Animation.DROP,
      },
    });
  }

  /**
   * Ajoute des marqueurs pour simuler une liste
   */
  public mockMarkers(nbMarkers: number): void {
    for( let i = 0; i < nbMarkers; i++) {
      this.addRandomMarker();
    }
    this.showMarkers(100);
  }

  public showMarkers(distanceMax: number): void {
    this.markers = [];
    this.markersList.forEach((marker: any) => {
      //console.log("marker " + marker.position.lat);
      if(this.distance(this.mapCenter.lat(), this.mapCenter.lng(), marker.position.lat, marker.position.lng) <= distanceMax)
        this.markers.push(marker);
    });
  }

  public onInputChange(event: any) {
    console.log("Change " + event.value);
    this.showMarkers(event.value);
  }

  /**
   * Calcule la distance en kilomètres entre latlng1 et latlng2
   * @param lat1 
   * @param lon1 
   * @param lat2 
   * @param lon2 
   * @returns la distance en kilomètres (float)
   */
  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    let a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
  
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  }

  /**
   * Interroge l'api google pour récupérer lat/lng de l'adresse en clair.
   */
  public onSubmit(): void {
    if (this.formGroup.invalid) return;
    this.geoLocationWorking = true; //signale qu'une requête de géolocalisation est en cours
    const address = this.formGroup.get("address")?.value;
    console.log(`submitted ${address} of length ${address.length}`);
    this.geoCodingService
      .getLocation(address)
      .subscribe({
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

            this.addMarker(loc.lat, loc.lng, "A", "", location.formatted_address);
            
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

  /**
   * Ouvre la fenêtre info au-dessus du marqueur indiqué.
   * @param marker Le marqueur au-dessus duquel doit s'ouvrir la fenêtre info
   * @param content Le contenu HTML de la fenêtre
   */
  openInfo(marker: MapMarker, content:string) {
    this.markerInfoContent = content;
    this.infoWindow.open(marker);
  }

  /**
   * Ferme la fenêtre pop-up (elle est unique et commune à tous les markers)
   */
  public closeInfo(): void {
    this.infoWindow.close();
  }
  
  /**
   * Demande au navigateur votre position
   */
  public MyPosition(): void {
    navigator.geolocation.getCurrentPosition((position) => {
      this.mapCenter = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    });
  }

  /**
   * Construit le code HTML à afficher pour l'annonce en info-bulle.
   * @param title Le titre de l'annonce
   * @param subtitle Le sous-titre de l'annonce
   * @param price Le prix de vente/location
   * @param picture La photo principale de l'annonce
   * @returns une chaine contenant l'innerHTML à afficher dans la fenêtre info.
   */
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
    let textLabel: string = "  ".repeat(4) + "300€";
    this.mapCenter = new google.maps.LatLng({lat: 50.62925, lng: 3.057256});
    let advertisement = this.infoAnnonce("Maison 3 pièces 90m²", "Lille 59000", "900€/mois charges comprises", "https://nsm09.casimages.com/img/2022/04/08//22040804151815960417859310.jpg");
    this.addMarker(50.62925, 3.057256, textLabel, this.iconHouse, advertisement);
  }

  public Marseille(): void {
    let annonce = this.infoAnnonce("Appartement 3 pièces 50m²", "Marseille", "675.000€", "https://nsm09.casimages.com/img/2022/04/01/22040104520915960417851182.jpg")
    let text: string = "  ".repeat(4) + "675k";
    this.addMarker(43.296482, 5.36978, text, this.iconBuilding, annonce);
    this.mapCenter = new google.maps.LatLng({lat: 43.296482, lng: 5.36978});
  }

  public Paris() {
    let annonce = this.infoAnnonce("Appartement 5 pièces 70m²", "Paris", "1 300 000 €", "https://nsm09.casimages.com/img/2022/04/08//22040804395115960417859322.jpg");
    let text: string = "  ".repeat(4) + "1,3M€";
    this.addMarker(48.866667, 2.333333, text, this.iconBuilding, annonce);
    this.mapCenter = new google.maps.LatLng({lat: 48.866667, lng: 2.333333});
  }

}
