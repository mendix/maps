import { Component, createElement } from "react";
import { LeafletEvent } from "leaflet";

import GoogleMap from "./GoogleMap";
import { LeafletMap } from "./LeafletMap";
import { Container } from "../utils/namespace";
import { fetchData, fetchMarkerObjectUrl, parseStaticLocations } from "../utils/Data";
import Utils from "../utils/Utils";
import { validLocation, validateLocationProps } from "../utils/Validations";
import { hot } from "react-hot-loader";

import "leaflet/dist/leaflet.css";
// Re-uses images from ~leaflet package
// Use workaround for marker icon, that is not standard compatible with webpack
// https://github.com/ghybs/leaflet-defaulticon-compatibility#readme
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "../ui/Maps.css";

type MapsContainerProps = Container.MapsContainerProps;
type MapProps = Container.MapProps;
type Location = Container.Location;
type DataSourceLocationProps = Container.DataSourceLocationProps;

export interface GeoJSONObj {
    mxObj: mendix.lib.MxObject;
    geoJSON: object | null;
    geoJSONStyle: object | null;
}

export interface MapsContainerState {
    alertMessage?: string;
    locations: Location[];
    geoJSONS: GeoJSONObj[];
    isFetchingData?: boolean;
}

class MapsContainer extends Component<MapsContainerProps, MapsContainerState> {
    private subscriptionHandles: number[] = [];
    readonly state: MapsContainerState = {
        alertMessage: "",
        locations: [],
        geoJSONS: [],
        isFetchingData: false
    };

    render() {
        const mapsApiToken = this.props.apiToken ? this.props.apiToken.replace(/ /g, "") : undefined;
        const commonProps = {
            ...this.props as MapProps,
            allLocations: this.state.locations,
            geoJSONs: this.state.geoJSONS,
            fetchingData: this.state.isFetchingData,
            className: this.props.class,
            alertMessage: this.state.alertMessage,
            divStyles: Utils.parseStyle(this.props.style),
            onClickMarker: this.onClickMarker,
            onClickGeoJSON: this.onClickGeoJSON,
            mapsToken: mapsApiToken,
            inPreviewMode: false
        };

        return this.props.mapProvider === "googleMaps"
            ? createElement(GoogleMap, { ...commonProps })
            : createElement(LeafletMap, { ...commonProps });
    }

    UNSAFE_componentWillReceiveProps(nextProps: MapsContainerProps) {
        this.resetSubscriptions(nextProps.mxObject);
        const validationMessage = validateLocationProps(nextProps);
        if (validationMessage) {
            this.setState({ alertMessage: validationMessage });
        } else {
            this.fetchData(nextProps.mxObject);
        }
    }

    componentWillUnmount() {
        this.unsubscribeAll();
    }

    private resetSubscriptions(contextObject?: mendix.lib.MxObject) {
        this.unsubscribeAll();
        if (this.props.locations && this.props.locations.length && contextObject) {
                this.subscriptionHandles.push(window.mx.data.subscribe({
                    guid: contextObject.getGuid(),
                    callback: () => {
                        if (!this.state.isFetchingData === true) {
                            this.fetchData(contextObject);
                        }
                    }
                }));
                this.props.locations.forEach(location => {
                    this.subscriptionHandles.push(window.mx.data.subscribe({
                        entity: location.locationsEntity as string,
                        callback: () => this.fetchData(contextObject)
                    }));
                    [
                        location.latitudeAttribute,
                        location.longitudeAttribute,
                        location.staticMarkerIcon,
                        location.markerImageAttribute
                    ].forEach(attr => this.subscriptionHandles.push(window.mx.data.subscribe({
                            attr,
                            callback: () => this.fetchData(contextObject),
                            guid: contextObject.getGuid()
                        }))
                    );
                });
            }
        }

    private unsubscribeAll() {
        this.subscriptionHandles.forEach(window.mx.data.unsubscribe);
        this.subscriptionHandles = [];
    }

    private fetchData = async (contextObject?: mendix.lib.MxObject) => {
        this.setState({ isFetchingData: true });
        const alertMessage: string[] = [];

        if (this.props.geoJSONEntity && this.props.geoJSONAttribute && this.props.geoJSONMicroflow) {
                const geoJSONS = await fetchData({
                    type: "microflow",
                    entity: this.props.geoJSONEntity,
                    mxform: this.props.mxform,
                    microflow: this.props.geoJSONMicroflow,
                    inputParameterEntity: "",
                    requiresContext: false
                }).then(objects => objects.map(obj => {
                    const text = obj.get(this.props.geoJSONAttribute as string);
                    let val = null;
                    try {
                        val = typeof(text) === "string" && text !== "" ? JSON.parse(text) : null;
                    } catch (error) {
                        alertMessage.push(`Error parsing GeoJSON for obj ${obj.getGuid()}`);
                        val = null;
                    }

                    let style: object | null = null;
                    if (this.props.geoJSONStyleAttribute) {
                        const styleText = obj.get(this.props.geoJSONStyleAttribute as string);
                        try {
                            style = typeof(styleText) === "string" && styleText !== "" ? JSON.parse(styleText) : null;
                        } catch (error) {
                            style = null;
                        }
                    }

                    const geoJSONObj: GeoJSONObj = {
                        mxObj: obj,
                        geoJSON: val,
                        geoJSONStyle: style
                    };

                    return geoJSONObj;
                }).filter(obj => obj.geoJSON !== null));
                this.setState({
                    geoJSONS
                });
        }

        Promise.all(this.props.locations.map(locationAttr => this.retrieveData(locationAttr, contextObject)))
            .then(allLocations => {
                const locations = allLocations.reduce((loc1, loc2) => loc1.concat(loc2), [])
                    .filter(location => {
                        if (validLocation(location)) {
                            return true;
                        }
                        alertMessage.push(`invalid location: latitude '${location.latitude}', longitude '${location.longitude}'`);

                        return false;
                    });
                this.setState({
                    locations,
                    isFetchingData: false,
                    alertMessage: alertMessage.join(", ")
                });
            })
            .catch((error: Error) => {
                this.setState({
                    locations: [],
                    alertMessage: error.message,
                    isFetchingData: false
                });
            });
    }

    private retrieveData(locationOptions: DataSourceLocationProps, contextObject?: mendix.lib.MxObject): Promise<Location[]> {
        const { dataSourceType, entityConstraint } = locationOptions;
        const requiresContext = dataSourceType === "microflow" || dataSourceType === "nanoflow"
            || (dataSourceType === "XPath" && entityConstraint.indexOf("[%CurrentObject%]") !== -1);

        if (dataSourceType === "static") {
            const staticLocation = parseStaticLocations([ locationOptions ]);

            return Promise.resolve(staticLocation);
        }
        if (dataSourceType === "context") {
            if (contextObject) {
                return this.setLocationsFromMxObjects([ contextObject ], locationOptions);
            }

            return Promise.resolve([]);
        }
        if (contextObject || !requiresContext) {
            return fetchData({
                    type: dataSourceType,
                    entity: locationOptions.locationsEntity,
                    constraint: entityConstraint,
                    microflow: locationOptions.dataSourceMicroflow,
                    mxform: this.props.mxform,
                    nanoflow: locationOptions.dataSourceNanoflow,
                    contextObject,
                    inputParameterEntity: locationOptions.inputParameterEntity,
                    requiresContext
                })
                .then(mxObjects => this.setLocationsFromMxObjects(mxObjects, locationOptions));
        }

        return Promise.resolve([]);
    }

    private setLocationsFromMxObjects(mxObjects: mendix.lib.MxObject[] | null, locationAttr: DataSourceLocationProps): Promise<Location[]> {
        if (!mxObjects) {
            return Promise.resolve([]);
        }

        return Promise.all(mxObjects.map(mxObject =>
            fetchMarkerObjectUrl({
                type: locationAttr.markerImage,
                markerIcon: locationAttr.staticMarkerIcon,
                imageAttribute: locationAttr.markerImageAttribute,
                systemImagePath: locationAttr.systemImagePath,
                markerEnumImages: this.props.markerImages
            }, mxObject)
            .then(markerUrl => {
                return {
                    latitude: Number(mxObject.get(locationAttr.latitudeAttribute)),
                    longitude: Number(mxObject.get(locationAttr.longitudeAttribute)),
                    mxObject,
                    url: markerUrl,
                    locationAttr
                };
            })
        ));
    }

    private onClickMarker = (event: LeafletEvent & google.maps.MouseEvent, locationAttr: DataSourceLocationProps) => {
        const { locations } = this.state;
        const latitude = this.props.mapProvider === "googleMaps" ? event.latLng.lat() : event.target.getLatLng().lat;
        this.executeAction(locations[locations.findIndex(targetLoc => targetLoc.latitude === latitude)], locationAttr);
    }

    private executeAction = (markerLocation: Location, locationAttr: DataSourceLocationProps) => {
        const object = markerLocation.mxObject;

        if (object) {
            const { mxform } = this.props;
            const { onClickEvent, onClickMicroflow, onClickNanoflow, openPageAs, page } = locationAttr;
            const context = new mendix.lib.MxContext();
            context.setContext(object.getEntity(), object.getGuid());

            if (onClickEvent === "callMicroflow" && onClickMicroflow) {
                mx.ui.action(onClickMicroflow, {
                    context,
                    origin: mxform,
                    error: error => mx.ui.error(`Error while executing on click microflow ${onClickMicroflow} : ${error.message}`)
                });
            } else if (onClickEvent === "callNanoflow" && onClickNanoflow.nanoflow) {
                window.mx.data.callNanoflow({
                    nanoflow: onClickNanoflow,
                    origin: mxform,
                    context,
                    error: error => {
                        logger.error(`${this.props.friendlyId}: Error while executing on click nanoflow: ${error.message}`);
                        mx.ui.error(`Error while executing on click nanoflow: ${error.message}`);
                    }
                });
            } else if (onClickEvent === "showPage" && page) {
                window.mx.ui.openForm(page, {
                    location: openPageAs,
                    context,
                    error: error => {
                        logger.error(`${this.props.friendlyId}: Error while opening page ${page}: ${error.message}`);
                        mx.ui.error(`Error while opening page ${page}: ${error.message}`);
                    }
                });
            }
        }
    }

    private onClickGeoJSON = (obj: mendix.lib.MxObject) => {
        const { geoJSONOnMicroflow } = this.props;
        if (obj && geoJSONOnMicroflow) {
            this.executeMicroflow(obj, geoJSONOnMicroflow);
        }
    }

    private executeMicroflow = (object: mendix.lib.MxObject, microflow: string) => {
        const { mxform } = this.props;
        const context = new mendix.lib.MxContext();

        context.setContext(object.getEntity(), object.getGuid());

        return new Promise((resolve, reject) => {
            if (!microflow || microflow === "") {
                return reject(new Error("Microflow parameter cannot be empty!"));
            }
            try {
                window.mx.data.action({
                    callback: resolve,
                    context,
                    error: reject,
                    origin: mxform,
                    params: {
                        actionname: microflow
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }
}

export default hot(module)(MapsContainer);
