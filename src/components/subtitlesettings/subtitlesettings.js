import require from 'require';
import globalize from 'globalize';
import appHost from 'apphost';
import appSettings from 'appSettings';
import focusManager from 'focusManager';
import layoutManager from 'layoutManager';
import loading from 'loading';
import connectionManager from 'connectionManager';
import subtitleAppearanceHelper from 'subtitleAppearanceHelper';
import settingsHelper from 'settingsHelper';
import dom from 'dom';
import events from 'events';
import 'listViewStyle';
import 'emby-select';
import 'emby-slider';
import 'emby-input';
import 'emby-checkbox';
import 'flexStyles';
import 'css!./subtitlesettings'

/**
 * Subtitle settings.
 * @module components/subtitleSettings/subtitleSettings
 */

function getSubtitleAppearanceObject(context) {
    let appearanceSettings = {};

    appearanceSettings.textSize = context.querySelector('#selectTextSize').value;
    appearanceSettings.dropShadow = context.querySelector('#selectDropShadow').value;
    appearanceSettings.font = context.querySelector('#selectFont').value;
    appearanceSettings.textBackground = context.querySelector('#inputTextBackground').value;
    appearanceSettings.textColor = context.querySelector('#inputTextColor').value;
    appearanceSettings.verticalPosition = context.querySelector('#sliderVerticalPosition').value;

    return appearanceSettings;
}

function loadForm(context, user, userSettings, appearanceSettings, apiClient) {

    apiClient.getCultures().then(function (allCultures) {

        if (appHost.supports('subtitleburnsettings') && user.Policy.EnableVideoPlaybackTranscoding) {
            context.querySelector('.fldBurnIn').classList.remove('hide');
        }

        let selectSubtitleLanguage = context.querySelector('#selectSubtitleLanguage');

        settingsHelper.populateLanguages(selectSubtitleLanguage, allCultures);

        selectSubtitleLanguage.value = user.Configuration.SubtitleLanguagePreference || '';
        context.querySelector('#selectSubtitlePlaybackMode').value = user.Configuration.SubtitleMode || '';

        context.querySelector('#selectSubtitlePlaybackMode').dispatchEvent(new CustomEvent('change', {}));

        context.querySelector('#selectTextSize').value = appearanceSettings.textSize || '';
        context.querySelector('#selectDropShadow').value = appearanceSettings.dropShadow || '';
        context.querySelector('#inputTextBackground').value = appearanceSettings.textBackground || 'transparent';
        context.querySelector('#inputTextColor').value = appearanceSettings.textColor || '#ffffff';
        context.querySelector('#selectFont').value = appearanceSettings.font || '';
        context.querySelector('#sliderVerticalPosition').value = appearanceSettings.verticalPosition;

        context.querySelector('#selectSubtitleBurnIn').value = appSettings.get('subtitleburnin') || '';

        onAppearanceFieldChange({
            target: context.querySelector('#selectTextSize')
        });

        loading.hide();
    });
}

function saveUser(context, user, userSettingsInstance, appearanceKey, apiClient) {

    let appearanceSettings = userSettingsInstance.getSubtitleAppearanceSettings(appearanceKey);
    appearanceSettings = Object.assign(appearanceSettings, getSubtitleAppearanceObject(context));

    userSettingsInstance.setSubtitleAppearanceSettings(appearanceSettings, appearanceKey);

    user.Configuration.SubtitleLanguagePreference = context.querySelector('#selectSubtitleLanguage').value;
    user.Configuration.SubtitleMode = context.querySelector('#selectSubtitlePlaybackMode').value;

    return apiClient.updateUserConfiguration(user.Id, user.Configuration);
}

function save(instance, context, userId, userSettings, apiClient, enableSaveConfirmation) {

    loading.show();

    appSettings.set('subtitleburnin', context.querySelector('#selectSubtitleBurnIn').value);

    apiClient.getUser(userId).then(function (user) {

        saveUser(context, user, userSettings, instance.appearanceKey, apiClient).then(function () {

            loading.hide();
            if (enableSaveConfirmation) {
                import('toast').then(({default: toast}) => {
                    toast(globalize.translate('SettingsSaved'));
                });
            }

            events.trigger(instance, 'saved');

        }, function () {
            loading.hide();
        });
    });
}

function onSubtitleModeChange(e) {

    let view = dom.parentWithClass(e.target, 'subtitlesettings');

    let subtitlesHelp = view.querySelectorAll('.subtitlesHelp');
    for (let i = 0, length = subtitlesHelp.length; i < length; i++) {
        subtitlesHelp[i].classList.add('hide');
    }
    view.querySelector('.subtitles' + this.value + 'Help').classList.remove('hide');
}

function onAppearanceFieldChange(e) {

    let view = dom.parentWithClass(e.target, 'subtitlesettings');

    let appearanceSettings = getSubtitleAppearanceObject(view);

    let elements = {
        window: view.querySelector('.subtitleappearance-preview-window'),
        text: view.querySelector('.subtitleappearance-preview-text'),
        preview: true
    };

    subtitleAppearanceHelper.applyStyles(elements, appearanceSettings);

    subtitleAppearanceHelper.applyStyles({
        window: view.querySelector('.subtitleappearance-fullpreview-window'),
        text: view.querySelector('.subtitleappearance-fullpreview-text')
    }, appearanceSettings);
}

const subtitlePreviewDelay = 1000;
let subtitlePreviewTimer;

function showSubtitlePreview(persistent) {
    clearTimeout(subtitlePreviewTimer);

    this._fullPreview.classList.remove('subtitleappearance-fullpreview-hide');

    if (persistent) {
        this._refFullPreview++;
    }

    if (this._refFullPreview === 0) {
        subtitlePreviewTimer = setTimeout(hideSubtitlePreview.bind(this), subtitlePreviewDelay);
    }
}

function hideSubtitlePreview(persistent) {
    clearTimeout(subtitlePreviewTimer);

    if (persistent) {
        this._refFullPreview--;
    }

    if (this._refFullPreview === 0) {
        this._fullPreview.classList.add('subtitleappearance-fullpreview-hide');
    }
}

function embed(options, self) {

    import('text!./subtitlesettings.template.html').then(({default: template}) => {

        options.element.classList.add('subtitlesettings');
        options.element.innerHTML = globalize.translateHtml(template, 'core');

        options.element.querySelector('form').addEventListener('submit', self.onSubmit.bind(self));

        options.element.querySelector('#selectSubtitlePlaybackMode').addEventListener('change', onSubtitleModeChange);
        options.element.querySelector('#selectTextSize').addEventListener('change', onAppearanceFieldChange);
        options.element.querySelector('#selectDropShadow').addEventListener('change', onAppearanceFieldChange);
        options.element.querySelector('#selectFont').addEventListener('change', onAppearanceFieldChange);
        options.element.querySelector('#inputTextColor').addEventListener('change', onAppearanceFieldChange);
        options.element.querySelector('#inputTextBackground').addEventListener('change', onAppearanceFieldChange);

        if (options.enableSaveButton) {
            options.element.querySelector('.btnSave').classList.remove('hide');
        }

        if (appHost.supports('subtitleappearancesettings')) {
            options.element.querySelector('.subtitleAppearanceSection').classList.remove('hide');

            self._fullPreview = options.element.querySelector('.subtitleappearance-fullpreview');
            self._refFullPreview = 0;

            const sliderVerticalPosition = options.element.querySelector('#sliderVerticalPosition');
            sliderVerticalPosition.addEventListener('input', onAppearanceFieldChange);
            sliderVerticalPosition.addEventListener('input', () => showSubtitlePreview.call(self));

            const eventPrefix = window.PointerEvent ? 'pointer' : 'mouse';
            sliderVerticalPosition.addEventListener(`${eventPrefix}enter`, () => showSubtitlePreview.call(self, true));
            sliderVerticalPosition.addEventListener(`${eventPrefix}leave`, () => hideSubtitlePreview.call(self, true));

            if (layoutManager.tv) {
                sliderVerticalPosition.addEventListener('focus', () => showSubtitlePreview.call(self, true));
                sliderVerticalPosition.addEventListener('blur', () => hideSubtitlePreview.call(self, true));

                // Give CustomElements time to attach
                setTimeout(() => {
                    sliderVerticalPosition.classList.add('focusable');
                    sliderVerticalPosition.enableKeyboardDragging();
                }, 0);
            }

            options.element.querySelector('.chkPreview').addEventListener('change', (e) => {
                if (e.target.checked) {
                    showSubtitlePreview.call(self, true);
                } else {
                    hideSubtitlePreview.call(self, true);
                }
            });
        }

        self.loadData();

        if (options.autoFocus) {
            focusManager.autoFocus(options.element);
        }
    });
}

export class SubtitleSettings {

    constructor(options) {

        this.options = options;

        embed(options, this);
    }

    loadData() {
        let self = this;
        let context = self.options.element;

        loading.show();

        let userId = self.options.userId;
        let apiClient = connectionManager.getApiClient(self.options.serverId);
        let userSettings = self.options.userSettings;

        apiClient.getUser(userId).then(function (user) {
            userSettings.setUserInfo(userId, apiClient).then(function () {
                self.dataLoaded = true;

                let appearanceSettings = userSettings.getSubtitleAppearanceSettings(self.options.appearanceKey);

                loadForm(context, user, userSettings, appearanceSettings, apiClient);
            });
        });
    }

    submit() {
        this.onSubmit(null);
    }

    destroy() {
        this.options = null;
    }

    onSubmit(e) {
        const self = this;
        let apiClient = connectionManager.getApiClient(self.options.serverId);
        let userId = self.options.userId;
        let userSettings = self.options.userSettings;

        userSettings.setUserInfo(userId, apiClient).then(function () {

            let enableSaveConfirmation = self.options.enableSaveConfirmation;
            save(self, self.options.element, userId, userSettings, apiClient, enableSaveConfirmation);
        });

        // Disable default form submission
        if (e) {
            e.preventDefault();
        }
        return false;
    }
}

export default SubtitleSettings;
