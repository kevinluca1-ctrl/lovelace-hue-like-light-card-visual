import { Consts } from '../types/consts';
import { Func1 } from '../types/functions';
import { ClickAction, KnownIconSize, SceneOrder, SceneProvider, SliderType } from '../types/types-config';

/** One field (or group of fields) of the HA `ha-form` schema. */
export interface HaFormSchema {
    readonly name: string;
    readonly type?: 'expandable' | 'grid';
    readonly title?: string;
    readonly icon?: string;
    readonly flatten?: boolean;
    readonly required?: boolean;
    readonly selector?: Record<string, unknown>;
    readonly schema?: readonly HaFormSchema[];
}

/** Plain card config as it is stored in YAML (only plain values, no parsed classes). */
export type PlainCardConfig = Record<string, unknown>;

/** Entity list item in YAML - either an entity id or an object with the `entity` key. */
type EntityListItem = string | { entity?: string };

/**
 * Converts the card YAML config to the data shown in the visual editor (`ha-form`) and back.
 * Options that can't be edited visually (e.g. `offClickData`, scene objects details) are kept untouched.
 */
export class HueCardEditorSchema {
    /** Default values of the options with a boolean or select field. Values equal to the default are not written into YAML. */
    public static readonly Defaults: Readonly<Record<string, unknown>> = {
        iconSize: KnownIconSize.Original,
        showSwitch: true,
        slider: SliderType.Default,
        sceneOrder: SceneOrder.Default,
        sceneProvider: [SceneProvider.HaScenes],
        offClickAction: ClickAction.Default,
        onClickAction: ClickAction.Default,
        offHoldAction: ClickAction.Default,
        onHoldAction: ClickAction.Default,
        allowZero: false,
        liveUpdate: true,
        theme: Consts.ThemeDefault,
        offShadow: true,
        hueBorders: true
    };

    /** Keys whose YAML value is a list of entities (strings or objects with `entity`). */
    private static readonly EntityListKeys = ['entities', 'scenes'];

    /** Keys where an empty list is a valid value (it differs from the default). */
    private static readonly EmptyListKeys = ['sceneProvider'];

    /** Keys where any numeric text should be stored as number. */
    private static readonly NumericKeys = ['iconSize'];

    /**
     * @returns `ha-form` schema of the editor.
     * @param optionLabel Returns the label of a select option value.
     */
    public static getSchema(optionLabel: Func1<string, string>): HaFormSchema[] {
        const select = (values: string[], extra: Record<string, unknown> = {}) => ({
            select: {
                options: values.map(value => ({ value, label: optionLabel(value) })),
                mode: 'dropdown',
                ...extra
            }
        });
        const clickActionSelect = select(Object.values(ClickAction));

        return [
            {
                name: 'entities_group',
                type: 'expandable',
                flatten: true,
                icon: 'mdi:lightbulb-group',
                schema: [
                    { name: 'entity', selector: { entity: { domain: 'light' } } },
                    { name: 'entities', selector: { entity: { domain: 'light', multiple: true } } },
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'floor', selector: { floor: {} } },
                            { name: 'area', selector: { area: {} } },
                            { name: 'label', selector: { label: {} } },
                            { name: 'groupEntity', selector: { entity: { domain: 'light' } } }
                        ]
                    }
                ]
            },
            {
                name: 'content_group',
                type: 'expandable',
                flatten: true,
                icon: 'mdi:text-box-outline',
                schema: [
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'title', selector: { text: {} } },
                            { name: 'icon', selector: { icon: {} } }
                        ]
                    },
                    { name: 'description', selector: { text: {} } }
                ]
            },
            {
                name: 'appearance_group',
                type: 'expandable',
                flatten: true,
                icon: 'mdi:palette-outline',
                schema: [
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'iconSize', selector: select(Object.values(KnownIconSize), { custom_value: true }) },
                            { name: 'slider', selector: select(Object.values(SliderType)) },
                            { name: 'theme', selector: { theme: {} } },
                            { name: 'defaultColor', selector: { text: {} } },
                            { name: 'offColor', selector: { text: {} } },
                            { name: 'hueScreenBgColor', selector: { text: {} } }
                        ]
                    },
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'showSwitch', selector: { boolean: {} } },
                            { name: 'offShadow', selector: { boolean: {} } },
                            { name: 'hueBorders', selector: { boolean: {} } },
                            { name: 'allowZero', selector: { boolean: {} } },
                            { name: 'liveUpdate', selector: { boolean: {} } }
                        ]
                    }
                ]
            },
            {
                name: 'scenes_group',
                type: 'expandable',
                flatten: true,
                icon: 'mdi:palette-swatch-variant',
                schema: [
                    { name: 'scenes', selector: { entity: { domain: 'scene', multiple: true } } },
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'sceneOrder', selector: select(Object.values(SceneOrder)) },
                            { name: 'switchOnScene', selector: { entity: { domain: 'scene' } } }
                        ]
                    },
                    { name: 'sceneProvider', selector: select(Object.values(SceneProvider), { multiple: true, mode: 'list' }) }
                ]
            },
            {
                name: 'actions_group',
                type: 'expandable',
                flatten: true,
                icon: 'mdi:gesture-tap',
                schema: [
                    {
                        name: '',
                        type: 'grid',
                        schema: [
                            { name: 'offClickAction', selector: clickActionSelect },
                            { name: 'onClickAction', selector: clickActionSelect },
                            { name: 'offHoldAction', selector: clickActionSelect },
                            { name: 'onHoldAction', selector: clickActionSelect }
                        ]
                    }
                ]
            }
        ];
    }

    /**
     * @returns Data for `ha-form` - defaults filled in, entity lists flattened to entity ids.
     */
    public static toFormData(config: PlainCardConfig): PlainCardConfig {
        const data: PlainCardConfig = { ...HueCardEditorSchema.Defaults, ...config };

        HueCardEditorSchema.EntityListKeys.forEach(key => {
            const list = config[key];
            if (Array.isArray(list)) {
                data[key] = list
                    .map(i => HueCardEditorSchema.getEntityId(i as EntityListItem))
                    .filter(i => !!i);
            }
        });

        // sceneProvider can be a single string in YAML
        if (typeof data.sceneProvider === 'string') {
            data.sceneProvider = [data.sceneProvider];
        }

        // custom_value select works with strings only
        if (typeof data.iconSize === 'number') {
            data.iconSize = data.iconSize.toString();
        }

        return data;
    }

    /**
     * @returns New YAML config built from the `ha-form` data.
     * Values equal to defaults and empty values are removed, entity objects from the old config are kept.
     * @param formData Data emitted by `ha-form`.
     * @param oldConfig Config before the change (source of the entity objects and the key order).
     */
    public static fromFormData(formData: PlainCardConfig, oldConfig: PlainCardConfig): PlainCardConfig {
        const result: PlainCardConfig = {};

        // keep the key order of the old config, append new keys at the end
        const keys = [...Object.keys(oldConfig), ...Object.keys(formData).filter(k => !(k in oldConfig))];

        keys.forEach(key => {
            // keys not edited by the form (type, card_mod, offClickData, ...) are kept as they are
            const value = key in formData ? formData[key] : oldConfig[key];

            if (HueCardEditorSchema.isEmpty(key, value, oldConfig[key]) || HueCardEditorSchema.isDefault(key, value))
                return;

            result[key] = HueCardEditorSchema.convertValue(key, value, oldConfig[key]);
        });

        return result;
    }

    private static convertValue(key: string, value: unknown, oldValue: unknown): unknown {
        if (HueCardEditorSchema.EntityListKeys.includes(key) && Array.isArray(value)) {
            return HueCardEditorSchema.mergeEntityList(value as string[], oldValue);
        }

        if (HueCardEditorSchema.NumericKeys.includes(key) && typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            return Number(value);
        }

        return value;
    }

    /**
     * @returns List of entities where items configured as objects in the old list (with title, icon, ...) are kept as objects.
     */
    private static mergeEntityList(ids: string[], oldValue: unknown): EntityListItem[] {
        const oldItems = Array.isArray(oldValue) ? oldValue as EntityListItem[] : [];

        return ids.map(id => oldItems.find(o => typeof o === 'object' && o?.entity === id) ?? id);
    }

    private static getEntityId(item: EntityListItem): string | undefined {
        return typeof item === 'string' ? item : item?.entity;
    }

    /**
     * @returns Whether the value should be removed from the config.
     * An empty list is kept for keys where it has its own meaning, or when it was already set in YAML (e.g. `scenes: []` = no scenes).
     */
    private static isEmpty(key: string, value: unknown, oldValue: unknown): boolean {
        if (Array.isArray(value)) {
            const wasEmptyList = Array.isArray(oldValue) && oldValue.length === 0;
            return value.length === 0 && !wasEmptyList && !HueCardEditorSchema.EmptyListKeys.includes(key);
        }

        return value == null || value === '';
    }

    private static isDefault(key: string, value: unknown): boolean {
        if (!(key in HueCardEditorSchema.Defaults))
            return false;

        return JSON.stringify(HueCardEditorSchema.Defaults[key]) === JSON.stringify(value);
    }
}
