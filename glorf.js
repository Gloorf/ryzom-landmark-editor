class Landmark {
    constructor(category, x, y, title) {
        this.x = x;
        this.y = y;
        this.category = category;
        this.title = title;
        this.marker = L.marker([this.x, this.y], {draggable: 'true'});
        this.createPopup();
        // Jquery quirks
        this.marker.bindPopup(this.popup[0]);
        this.marker.on('dragend', this.onDragEnd.bind(this));
    }

    createPopup() {
        this.popup = $('<div>');
        this.deleteButton = $('#deleteLandmarkTemplate').clone().removeAttr('id').click(this.onDeleteClicked.bind(this));
        this.popup.append(this.deleteButton);
        this.categorySelect = $('#configLandmarkDefaultCategory').clone().removeAttr('id');
        this.categorySelect.val(this.category);
        this.categorySelect.change(this.onCategoryChange.bind(this));
        this.popup.append(this.categorySelect);
        this.titleInput = $('<input category="text">').val(this.title).change(this.onTitleChange.bind(this));
        this.popup.append(this.titleInput);
    }

    updateIcon(color, iconSize) {
        if(!this.marker) {
            console.warn("updateIcon called but marker is null for marker ", this.title);
            return;
        }
        this.icon = Ryzom.icon('lm_marker', color, iconSize);
        this.marker.setIcon(this.icon);
    }

    asXml(xml) {
        return $('<landmark />', xml).attr('type', this.category).attr('x', this.x).attr('y', this.y).attr('title', this.title);
    }

    hideTooltip() {
        this.marker.unbindTooltip();
    }

    showTooltip() {
        this.marker.bindTooltip(this.title);
    }


    onDeleteClicked() {
        $(document).trigger("landmarkDelete", [this]);
    }

    onCategoryChange() {
        var newCategory = this.categorySelect.val();
        var oldCategory = this.category;
        $(document).trigger("landmarkCategoryChange", [this, oldCategory, newCategory]);
        this.category = newCategory;
    }

    onTitleChange(event) {
        this.title = this.titleInput.val();
        if(config.tooltip) {
            this.marker.bindTooltip(this.title);
        }
    }

    onDragEnd(event) {
        this.x = this.marker.getLatLng().lat;
        this.y = this.marker.getLatLng().lng;
    }
}


class LandmarkManager {
    constructor(map) {
        this.map = map;
        this.landmarks = [];
        this.createLandmarkCategories();
        this.createGroups();
        // All triggers
        $(document).on("landmarkCategoryChange", this.onLandmarkCategoryChange.bind(this));
        $(document).on("landmarkDelete", this.onLandmarkDelete.bind(this));
        $('#configIconSize').change(this.onIconSizeChange.bind(this));
        $('#xmlLoadButton').click(this.onLoadXmlClicked.bind(this));
        $('#deleteLandmarksButton').click(this.onDeleteLandmarksClicked.bind(this));
        $('#xmlExportButton').click(this.onExportXmlClicked.bind(this));
        $('#configTooltip').click(this.onTooltipVisibilityChange.bind(this));
        map.on('click', this.onMapClicked.bind(this));
        $('#hideAllCategories').click(this.onHideAllCategories.bind(this));
        $('#showAllCategories').click(this.onShowAllCategories.bind(this));

    }

    createGroups() {
        this.landmarkGroups = [];
        // We'll populate this later, null init
        this.landmarkControl = new L.control.layers(null, null, {collapsed: false});
        this.map.addControl(this.landmarkControl);
        for(const landmarkCategory of this.landmarkCategories) {
            var newGroup = new L.layerGroup();
            this.landmarkGroups.push(newGroup);
            this.landmarkControl.addOverlay(newGroup, landmarkCategory.name);
            newGroup.addTo(this.map);
        }
    }

    createLandmarkCategories() {
        this.landmarkCategories = [];
        $('#configLandmarkDefaultCategory option').each(function(index, item) {
            var name = $(item).text();
            var color = $(item).attr('data-color');
            this.landmarkCategories.push({name: name, color: color});
        }.bind(this));
    }


    // return true if a landmark exist at the same coordinates
    _landmarkExists(x, y) {
        for(const landmark of this.landmarks) {
            if (landmark.x == x && landmark.y == y) {
                return true;
            }
        }
        return false;
    }

    _createLandmark(category, x, y, title) {
        if(this._landmarkExists(x, y)) {
            console.log(`Not adding landmark ${title} at x:${x} y:${y}, another one already exists here`);
            return;
        }
        if(category > this.landmarkCategories.length || category < 0) {
            console.warn(`Tried to create landmark ${title} at [${x}, ${y}] with unknown category ${category}, defaulting to misc`);
            category = 0;
        }
        var color = this.landmarkCategories[category].color;
        var landmark = new Landmark(category, x, y, title, this.landmarkCategories);
        landmark.updateIcon(color, config.iconSize);
        if(config.tooltip) {
            landmark.showTooltip();
        }
        // Store it in the correct place
        this.landmarks.push(landmark);
        this.landmarkGroups[category].addLayer(landmark.marker);
    }

    _parseSingleLandmark(index, item) {
        var category = $(item).attr('type');
        var x = $(item).attr('x');
        var y = $(item).attr('y');
        var title = $(item).attr('title');
        this._createLandmark(category, x, y, title);
    }

    updateLandmarkGroup(landmark, oldCategory, newCategory) {
        this.landmarkGroups[oldCategory].removeLayer(landmark.marker);
        this.landmarkGroups[newCategory].addLayer(landmark.marker);
    }


    createLandmarks(xml) {
        if(!this.landmarkGroups) {
            this.createGroups();
        }
        $($.parseXML(xml)).find('landmark').each(this._parseSingleLandmark.bind(this));
    }

    cleanState() {
        // first, remove from the map the objects itself
        if(this.landmarkGroups) {
            for (const group of this.landmarkGroups) {
                group.remove();
            }
        }
        // Then, the control layer
        if (this.landmarkControl) {
            this.map.removeControl(this.landmarkControl);
        }
        // Time to reset our data structures
        this.landmarkControl = null;
        this.landmarkGroups = null;
        this.landmarks = [];
        // Don't forget to create new groups !
        this.createGroups();
    }

    exportXml() {
        // We need to put landmarks in the correct regions
        // Thankfully, nimetu thought of that, so mapping coordinates to a continent is pretty easy
        // Base XML
        var xml = $.parseXML('<?xml version="1.0" ?><interface_config />');
        // First, we'll generate our data store (landmarks sorted by regions)
        var regionNames = ["bagne", "corrupted_moor", "fyros", "fyros_island", "fyros_newbie", "indoors", "kitiniere", "matis", "matis_island", "matis_newbie", "newbieland", "nexus", "r2_desert", "r2_forest", "r2_jungle", "r2_lakes", "r2_roots", "route_gouffre", "sources", "terre", "testroom", "tryker", "tryker_island", "tryker_newbie", "zorai", "zorai_island", "zorai_newbie"];
        var regions = {};
        for(const name of regionNames) {
            regions[name] = [];
        }
        // Now, put the landmarks in the correct region
        var outsideBounds = [];

        for(const landmark of this.landmarks) {
            try  {
                var continent = Ryzom.XY.findIngameAreas(landmark.x, landmark.y).
                    filter(x => x.order == 0)[0].key;
                regions[continent].push(landmark);
            } catch (error) {
                outsideBounds.push(landmark);
            }
        }
        if(outsideBounds.length > 0) {
            var message = "One or more of your landmarks are outside of any known continents, they won't be exported : ";
            for(const landmark of outsideBounds) {
                message += `\n${landmark.title} x: ${landmark.x}, y: ${landmark.y}`;
            }
            alert(message);
        }
        //Now, generate correct XML
        //Note : we iterate over regionNames instead of the dict, to make sure the order is the same as a regular landmark file. I'm 99% sure that it doesn't matter for ryzom client, but better safe than sorry
        for(const name of regionNames) {
            var region = $('<landmarks />', xml).attr('continent', name).attr('type', 'user');
            for(const landmark of regions[name]) {
                var markXml = landmark.asXml(xml);
                $(region).append(markXml);
            }
            $('interface_config', xml).append(region);
        }
        // We'll do a tiny bit of XML beautify, so it's not one long string with no newline (shitty text editors, like notepad, might struggle on copy/paste if there's a lot of landmarks)
        var xmlStr = new XMLSerializer().serializeToString(xml);
        // Line break after single elements should be more than enough for now
        xmlStr = xmlStr.replaceAll("/>", "/>\n");
        return xmlStr;
    }

    onHideAllCategories (event) {
        for(const group of this.landmarkGroups) {
            this.map.removeLayer(group);
        }
    }

    onShowAllCategories (event) {
        for(const group of this.landmarkGroups) {
            group.addTo(this.map);
        }
    }

    // Add landmarks in XML source
    onLoadXmlClicked(event) {
        // Sanity check, should never be triggered
        if(!this.landmarkGroups) {
            this.createGroups();
            console.warn(`onLoadXmlClicked: I had to createGroups, why ??`);
        }
        var xml = $('#xmlSource').val();
        // To prevent accidental multiclick
        if(this.oldXml && xml == this.oldXml) {
            if(!confirm("You are adding the same XML as last one, probably because you clicked multiples times on the add button. Are you sure this is what you want to do ?")) {
                return;
            }
        }
        this.oldXml = xml;
        this.createLandmarks(xml);
    }

    // Remove everything !
    onDeleteLandmarksClicked(event) {
        if(!confirm("Are you sure you want to delete all landmarks ?")) {
            return;
        }
        this.cleanState();
    }

    onExportXmlClicked(event) {
        var xml = this.exportXml();
        $('#xmlDestination').val(xml);
    }

    onIconSizeChange(event) {
        for(const landmark of this.landmarks) {
            var color = this.landmarkCategories[landmark.category].color;
            landmark.updateIcon(color, config.iconSize);
        }

    }

    onTooltipVisibilityChange(event) {
        for(const landmark of this.landmarks) {
            if(config.tooltip) {
                landmark.showTooltip();
            }
            else {
                landmark.hideTooltip();
            }
        }
    }

    onMapClicked(event) {
        if(!config.landmarkOnClick) {
            return;
        }
        var category = config.landmarkDefaultCategory;
        var title = "New Landmark";
        var x = event.latlng.lat;
        var y = event.latlng.lng;
        this._createLandmark(category, x, y, title);
    }

    onLandmarkCategoryChange(event, landmark, oldCategory, newCategory) {
        // First, we need to change the group (or else control will be buggy):w
        this.updateLandmarkGroup(landmark, oldCategory, newCategory);
        // Then, update the icon
        var color = this.landmarkCategories[newCategory].color;
        landmark.updateIcon(color, config.iconSize);
    }

    onLandmarkDelete(event, landmark) {
        // Remove it from the group
        this.landmarkGroups[landmark.category].removeLayer(landmark.marker);
        if(this.landmarks.indexOf(landmark) != -1) {
            this.landmarks.splice(this.landmarks.indexOf(landmark), 1);
        }
        else {
            console.warn(`Couldn't delete landmark named ${landmark.title} from this.landmarks, should not happen !`);
        }
    }
}

class Config {
    constructor() {
        // Default value
        this.width = 1024;
        this.height = 800;
        this.lang = 'en';
        this.iconSize = 32;
        this.tooltip = true;
        this.landmarkOnClick = false;
        this.landmarkDefaultCategory = 0;
        $('#configWidth').change(this.onWidthChange.bind(this));
        $('#configHeight').change(this.onHeightChange.bind(this));
        $('#configIconSize').change(this.onIconSizeChange.bind(this));
        $('#configLandmarkDefaultCategory').change(this.onMarkerDefaultCategoryChange.bind(this));
        $('#configLang').change(this.onLangChange.bind(this));
        $('#configTooltip').click(this.onTooltipChange.bind(this));
        $('#configLandmarkOnClick').click(this.onLandmarkOnClickChange.bind(this));
    }

    restoreFromCookies() {
        if(Cookies.get('width')) {
            this.width = parseInt(Cookies.get('width'), 10);
            $('#configWidth').val(this.width);
        }
        if(Cookies.get('height')) {
            this.height = parseInt(Cookies.get('height'), 10);
            $('#configHeight').val(this.height);
        }
        if(Cookies.get('iconSize')) {
            this.iconSize = parseInt(Cookies.get('iconSize'), 10);
            $('#configIconSize').val(this.iconSize);
        }
        if(Cookies.get('landmarkDefaultCategory')) {
            this.landmarkDefaultCategory = parseInt(Cookies.get('landmarkDefaultCategory'), 10);
            $('#configLandmarkDefaultCategory').val(this.landmarkDefaultCategory);
        }   
        if(Cookies.get('lang')) {
            this.lang = Cookies.get('lang');
            $('#configLang').val(this.lang);
        }
        if(Cookies.get('tooltip')) {
            this.tooltip = Cookies.get('tooltip') == "true";
            $('#configTooltip').prop('checked', this.tooltip);
        }
        if(Cookies.get('landmarkOnClick')) {
            this.landmarkOnClick = Cookies.get('landmarkOnClick') == "true";
            $('#configLandmarkOnClick').prop('checked', this.landmarkOnClick);
        }
    }

    saveToCookies() {
        var options = {sameSite: "Lax"};
        for(var key in this) {
            if(!this.hasOwnProperty(key)) {
                continue;
            }
            Cookies.set(key, this[key], options);
        }
    }

    onHeightChange() {
        this.height = parseInt($('#configHeight').val(), 10);
        updateMapSize(this.width, this.height);
        this.saveToCookies();
    }

    onWidthChange() {
        this.width = parseInt($('#configWidth').val(), 10);
        updateMapSize(this.width, this.height);
        this.saveToCookies();
    }

    onIconSizeChange() {
        this.iconSize = parseInt($('#configIconSize').val(), 10);
        this.saveToCookies();
    }

    onMarkerDefaultCategoryChange() {
        this.landmarkDefaultCategory = parseInt($('#configLandmarkDefaultCategory').val(), 10);
        this.saveToCookies();
    }

    onLangChange() {
        this.lang = $('#configLang').val();
        this.saveToCookies();
    }

    onTooltipChange() {
        this.tooltip = $('#configTooltip').is(":checked");
        this.saveToCookies();
    }

    onLandmarkOnClickChange() {
        this.landmarkOnClick = $('#configLandmarkOnClick').is(":checked");
        this.saveToCookies();
    }
}

function updateMapSize(width, height) {
    $('#ryzomMap').css('width', width);
    $('#ryzomMap').css('height', height);
}

// Return icon using local cache instead of bmsite API
function getLocalMarkerIcon(name, color, size) {
    var uri = `images/${size}/${color}/${name}.png`;
    var halfSize = Math.floor(size / 2);
    return L.icon({
        iconUrl: uri,
        iconSize: [size, size],
        iconAnchor: [halfSize, halfSize],
        popupAnchor: [0, -halfSize]
    });
}


function init() {
    // Do the actual translation
    $('html').i18n();

    // Patch Ryzom.icon to use local cache instead of bmsite API
    Ryzom.icon = getLocalMarkerIcon;

    // Map init
    var map = Ryzom.map('ryzomMap', {rzLang: config.lang});
    map.addControl(new L.Control.MousePosition());
    // Manager init
    var landmarkManager = new LandmarkManager(map);

    //Reset our fields
    $('#xmlSource').val('');
    $('#xmlDestination').val('');
    $('#xml_add').val('');
   
}

var config = null;
// Triggered when page is loaded
$(function() {
    config = new Config();
    config.restoreFromCookies();
    $.i18n().locale = config.lang;
    $.i18n().load({'en': 'i18n/en.json', 'fr': 'i18n/fr.json'}).done(init);
});
