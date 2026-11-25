import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Consts } from '../types/consts';
import { IHassWindow } from '../types/types-hass';
import { localize } from '../localize/localize';
import { ConsoleLogger } from '../core/console-logger';
import { HaFormSchema, HueCardEditorSchema, PlainCardConfig } from './card-editor-schema';

const log = new ConsoleLogger('HueCardEditor');

/** Detail of the `value-changed` event raised by `ha-form`. */
export interface IHaFormValueChangedEventDetail {
    value: PlainCardConfig;
}

type LocalizeKey = Parameters<typeof localize>[1];

/**
 * Visual editor of the card, shown in the Home Assistant card configuration dialog.
 */
@customElement(HueLikeLightCardEditor.ElementName)
export class HueLikeLightCardEditor extends LitElement implements LovelaceCardEditor {
    public static readonly ElementName = Consts.CardElementName + '-editor';

    private static readonly HaFormElementName = 'ha-form';

    @property({ attribute: false })
    public hass?: HomeAssistant;

    @state()
    private _config?: PlainCardConfig;

    @state()
    private _isFormLoaded = !!customElements.get(HueLikeLightCardEditor.HaFormElementName);

    public setConfig(config: PlainCardConfig): void {
        this._config = config;
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        if (!this._isFormLoaded) {
            HueLikeLightCardEditor.loadHaForm().then(() => this._isFormLoaded = true);
        }
    }

    /**
     * `ha-form` is lazy loaded by HA and might not be registered yet when this editor is opened.
     * Opening the editor of a built-in card registers it (HA 2023.4+ - `loadCardHelpers` and `getConfigElement` of the entities card).
     */
    private static async loadHaForm(): Promise<void> {
        try {
            const helpers = await (window as IHassWindow).loadCardHelpers?.();
            const card = await helpers?.createCardElement({ type: 'entities', entities: [] });
            const cardClass = card?.constructor as { getConfigElement?(): Promise<unknown> } | undefined;
            await cardClass?.getConfigElement?.();
            await customElements.whenDefined(HueLikeLightCardEditor.HaFormElementName);
        }
        catch (error) {
            log.error('Unable to load the Home Assistant form element', error);
        }
    }

    protected override render() {
        if (!this.hass || !this._config || !this._isFormLoaded)
            return nothing;

        return html`
            <ha-form
                .hass=${this.hass}
                .data=${HueCardEditorSchema.toFormData(this._config)}
                .schema=${HueCardEditorSchema.getSchema(value => this.localize(`editor.option.${value}`, value))}
                .computeLabel=${(s: HaFormSchema) => this.localize(`editor.field.${s.name}`, s.name)}
                .computeHelper=${(s: HaFormSchema) => this.localize(`editor.helper.${s.name}`, '')}
                @value-changed=${this.onValueChanged}
            ></ha-form>
        `;
    }

    private onValueChanged(ev: CustomEvent<IHaFormValueChangedEventDetail>) {
        ev.stopPropagation();
        if (!this._config)
            return;

        this._config = HueCardEditorSchema.fromFormData(ev.detail.value, this._config);

        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * @returns Translated text for a dynamically built key, or the fallback when the key doesn't exist.
     */
    private localize(key: string, fallback: string): string {
        const translated = localize(this.hass!, key as LocalizeKey);
        return translated === key ? fallback : translated;
    }
}
