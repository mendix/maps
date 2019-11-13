import { GeoJSONObj } from "../components/MapsContainer";

export namespace Container {

    export type MarKerImages = "systemImage" | "staticImage" | "enumImage";
    export type DataSource = "static" | "XPath" | "microflow" | "context" | "nanoflow";
    export type OnClickOptions = "doNothing" | "showPage" | "callMicroflow" | "callNanoflow";
    export type PageLocation = "content" | "popup" | "modal";
    export type mapProviders = "openStreet" | "mapBox" | "hereMaps" | "googleMaps";
    export type OpenStreetMapType =
        "defaultMaps" |
        "OpenStreetMap_Mapnik" |
        "OpenStreetMap_BlackAndWhite" |
        "OpenStreetMap_DE" |
        "OpenStreetMap_France" |
        "OpenStreetMap_HOT" |
        "OpenTopoMap" |
        "Thunderforest_OpenCycleMap" |
        "Thunderforest_Transport" |
        "Thunderforest_TransportDark" |
        "Thunderforest_SpinalMap" |
        "Thunderforest_Landscape" |
        "Thunderforest_Outdoors" |
        "Thunderforest_Pioneer" |
        "Hydda_Full" |
        "Hydda_Base" |
        "Hydda_RoadsAndLabels" |
        "Stamen_Toner" |
        "Stamen_TonerBackground" |
        "Stamen_TonerHybrid" |
        "Stamen_TonerLines" |
        "Stamen_TonerLabels" |
        "Stamen_TonerLite" |
        "Stamen_Watercolor" |
        "Stamen_Terrain" |
        "Stamen_TerrainBackground" |
        "Stamen_TopOSMRelief" |
        "Stamen_TopOSMFeatures" |
        "Esri_WorldStreetMap" |
        "Esri_DeLorme" |
        "Esri_WorldTopoMap" |
        "Esri_WorldImagery" |
        "Esri_WorldTerrain" |
        "Esri_WorldShadedRelief" |
        "Esri_WorldPhysical" |
        "Esri_OceanBasemap" |
        "Esri_NatGeoWorldMap" |
        "Esri_WorldGrayCanvas" |
        "BasemapAT_basemap" |
        "BasemapAT_grau" |
        "BasemapAT_overlay" |
        "BasemapAT_highdpi" |
        "BasemapAT_orthofoto" |
        "nlmaps_standaard" |
        "nlmaps_pastel" |
        "nlmaps_grijs" |
        "nlmaps_luchtfoto" |
        "NASAGIBS_ModisTerraTrueColorCR" |
        "NASAGIBS_ModisTerraBands367CR" |
        "NASAGIBS_ViirsEarthAtNight2012" |
        "NASAGIBS_ModisTerraLSTDay" |
        "NASAGIBS_ModisTerraSnowCover" |
        "NASAGIBS_ModisTerraAOD" |
        "NASAGIBS_ModisTerraChlorophyll" |
        "NLS";

    export interface WrapperProps {
        "class"?: string;
        friendlyId: string;
        mxform: mxui.lib.form._FormBase;
        mxObject?: mendix.lib.MxObject;
        style?: string;
    }

    export interface MapsContainerProps extends WrapperProps, MapProps {
        locations: DataSourceLocationProps[];
        markerImages: EnumerationImages[];
    }

    export interface DataSourceLocationProps extends DatabaseLocationProps, StaticLocationProps, MarkerIconProps, MarkerEvents {
        dataSourceType: DataSource;
        locationsEntity: string;
        entityConstraint: string;
        dataSourceMicroflow: string;
        dataSourceNanoflow: Data.Nanoflow;
        inputParameterEntity: string;
    }

    export interface DatabaseLocationProps {
        latitudeAttribute: string;
        longitudeAttribute: string;
    }

    export interface StaticLocationProps {
        staticLatitude: string;
        staticLongitude: string;
    }

    export interface Location {
        latitude: number;
        longitude: number;
        mxObject?: mendix.lib.MxObject;
        url?: string;
        locationAttr?: Container.DataSourceLocationProps;
    }

    export interface DefaultLocations {
        defaultCenterLatitude: string;
        defaultCenterLongitude: string;
    }

    export interface MarkerIconProps {
        markerImage: MarKerImages;
        staticMarkerIcon: string;
        systemImagePath: string;
        markerImageAttribute: string;
    }

    export interface MarkerEvents {
        onClickMicroflow: string;
        onClickNanoflow: Data.Nanoflow;
        onClickEvent: OnClickOptions;
        openPageAs: PageLocation;
        page: string;
    }

    export interface MapControlOptions {
        optionDrag?: boolean;
        optionScroll?: boolean;
        optionZoomControl?: boolean;
        attributionControl?: boolean;
        optionStreetView?: boolean;
        mapTypeControl?: boolean;
        fullScreenControl?: boolean;
        rotateControl?: boolean;
        mapStyles?: string;
    }

    export interface OpenStreetMapOptions {
        openStreetMapType?: OpenStreetMapType;
    }

    export interface GeoJSONOptions {
        geoJSONEntity?: string;
        geoJSONAttribute?: string;
        geoJSONStyleAttribute?: string;
        geoJSONMicroflow?: string;
        geoJSONOnMicroflow?: string;
    }

    export interface EnumerationImages {
        enumKey: string;
        enumImage: string;
    }

    export interface MapProps extends MapControlOptions, DefaultLocations, MapUtils.Dimensions, GeoJSONOptions, OpenStreetMapOptions {
        mapProvider: mapProviders;
        apiToken?: string;
    }
}

export namespace Data {

    export interface FetchDataOptions {
        type: Container.DataSource;
        entity?: string;
        guid?: string;
        mxform: mxui.lib.form._FormBase;
        constraint?: string;
        microflow?: string;
        nanoflow?: Nanoflow;
        contextObject?: mendix.lib.MxObject;
        inputParameterEntity: string;
        requiresContext: boolean;
    }

    export interface FetchByXPathOptions {
        guid?: string;
        entity: string;
        constraint: string;
    }
    export interface Nanoflow {
        nanoflow: object[];
        paramsSpec: { Progress: string };
    }

    export interface FetchMarkerIcons {
        type: Container.MarKerImages;
        markerIcon: string;
        imageAttribute: string;
        markerEnumImages: Container.EnumerationImages[];
        systemImagePath: string;
    }
}

export namespace MapUtils {

    export interface SharedProps {
        allLocations?: Container.Location[];
        geoJSONs?: GeoJSONObj[];
        className?: string;
        alertMessage?: string;
        fetchingData?: boolean;
        divStyles: object;
        mapsToken?: string;
        inPreviewMode: boolean;
    }

    export type heightUnitType = "percentageOfWidth" | "percentageOfParent" | "pixels";
    export type widthUnitType = "percentage" | "pixels";

    export interface Dimensions {
        autoZoom?: boolean;
        zoomLevel: number;
        widthUnit: widthUnitType;
        width: number;
        height: number;
        heightUnit: heightUnitType;
    }

    export interface CustomTypeUrls {
        readonly openStreetMap: string;
        readonly mapbox: string;
        readonly hereMaps: string;
    }

    export interface MapAttributions {
        readonly openStreetMapAttr: string;
        readonly mapboxAttr: string;
        readonly hereMapsAttr: string;
    }
}
