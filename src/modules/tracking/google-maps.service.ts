import axios from "axios";
import { env } from "../../config/env";

// Google Maps API Response Interfaces
export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  types: string[];
}

export interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

export interface DistanceMatrixResult {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

export interface DistanceMatrixResponse {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: {
    elements: DistanceMatrixResult[];
  }[];
  status: string;
}

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  polyline: string;
  steps: {
    distance: number;
    duration: number;
    instruction: string;
    location: {
      lat: number;
      lng: number;
    };
  }[];
}

export interface DirectionsResponse {
  routes: {
    legs: {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      steps: {
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        html_instructions: string;
        polyline: {
          points: string;
        };
        start_location: {
          lat: number;
          lng: number;
        };
        end_location: {
          lat: number;
          lng: number;
        };
      }[];
    }[];
    overview_polyline: {
      points: string;
    };
  }[];
  status: string;
}

export class GoogleMapsService {
  private static readonly API_KEY = env.GOOGLE_MAPS_API_KEY;
  private static readonly BASE_URL = "https://maps.googleapis.com/maps/api";

  // Geocode an address to get coordinates
  static async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get<GeocodeResponse>(
        `${this.BASE_URL}/geocode/json`,
        {
          params: {
            address,
            key: this.API_KEY,
          },
        }
      );

      if (response.data.status === "OK" && response.data.results.length > 0) {
        return response.data.results[0];
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      throw new Error("Failed to geocode address");
    }
  }

  // Reverse geocode coordinates to get address
  static async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<GeocodeResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get<GeocodeResponse>(
        `${this.BASE_URL}/geocode/json`,
        {
          params: {
            latlng: `${lat},${lng}`,
            key: this.API_KEY,
          },
        }
      );

      if (response.data.status === "OK" && response.data.results.length > 0) {
        return response.data.results[0];
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      throw new Error("Failed to reverse geocode coordinates");
    }
  }

  // Calculate distance and duration between two points
  static async calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
  ): Promise<DistanceMatrixResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get<DistanceMatrixResponse>(
        `${this.BASE_URL}/distancematrix/json`,
        {
          params: {
            origins: `${origin.lat},${origin.lng}`,
            destinations: `${destination.lat},${destination.lng}`,
            mode,
            key: this.API_KEY,
          },
        }
      );

      if (response.data.status === "OK" && response.data.rows[0]?.elements[0]) {
        return response.data.rows[0].elements[0];
      }

      return null;
    } catch (error) {
      console.error("Distance calculation error:", error);
      throw new Error("Failed to calculate distance");
    }
  }

  // Get directions between two points
  static async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
  ): Promise<RouteResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get<DirectionsResponse>(
        `${this.BASE_URL}/directions/json`,
        {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            mode,
            key: this.API_KEY,
          },
        }
      );

      if (response.data.status === "OK" && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        return {
          distance: leg.distance.value,
          duration: leg.duration.value,
          polyline: route.overview_polyline.points,
          steps: leg.steps.map((step) => ({
            distance: step.distance.value,
            duration: step.duration.value,
            instruction: step.html_instructions,
            location: step.start_location,
          })),
        };
      }

      return null;
    } catch (error) {
      console.error("Directions error:", error);
      throw new Error("Failed to get directions");
    }
  }

  // Calculate distance between two points using Haversine formula (fallback)
  static calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  // Convert degrees to radians
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get nearby places
  static async getNearbyPlaces(
    location: { lat: number; lng: number },
    radius: number = 1000,
    type?: string
  ): Promise<any[]> {
    try {
      if (!this.API_KEY) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get(
        `${this.BASE_URL}/place/nearbysearch/json`,
        {
          params: {
            location: `${location.lat},${location.lng}`,
            radius,
            type,
            key: this.API_KEY,
          },
        }
      );

      if (response.data.status === "OK") {
        return response.data.results;
      }

      return [];
    } catch (error) {
      console.error("Nearby places error:", error);
      throw new Error("Failed to get nearby places");
    }
  }

  // Validate coordinates
  static isValidCoordinate(lat: number, lng: number): boolean {
    return (
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }

  // Format distance for display
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  // Format duration for display
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
