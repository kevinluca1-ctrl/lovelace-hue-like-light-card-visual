import { HaFormSchema, HueCardEditorSchema } from '../src/editor/card-editor-schema';
import { HueLikeLightCardConfig } from '../src/types/config';
import { HueLikeLightCardConfigInterface } from '../src/types/types-config';
import en from '../src/localize/languages/en_us.json';

function collectNames(schema: readonly HaFormSchema[]): string[] {
    return schema.flatMap(s => [s.name, ...(s.schema ? collectNames(s.schema) : [])]).filter(n => !!n);
}

describe('Card editor schema', () => {
    it('should fill defaults into form data', () => {
        const data = HueCardEditorSchema.toFormData({ type: 'custom:hue-like-light-card', entity: 'light.a' });

        expect(data.entity).toBe('light.a');
        expect(data.showSwitch).toBe(true);
        expect(data.allowZero).toBe(false);
        expect(data.sceneProvider).toStrictEqual(['ha-scenes']);
    });

    it('should flatten entity objects to ids in form data', () => {
        const data = HueCardEditorSchema.toFormData({
            entities: ['light.a', { entity: 'light.b', title: 'B' }],
            scenes: [{ entity: 'scene.x', color: 'red' }, 'scene.y']
        });

        expect(data.entities).toStrictEqual(['light.a', 'light.b']);
        expect(data.scenes).toStrictEqual(['scene.x', 'scene.y']);
    });

    it('should convert single sceneProvider and numeric iconSize for the form', () => {
        const data = HueCardEditorSchema.toFormData({ sceneProvider: 'scene-presets', iconSize: 1.5 });

        expect(data.sceneProvider).toStrictEqual(['scene-presets']);
        expect(data.iconSize).toBe('1.5');
    });

    it('should not write defaults and empty values into config', () => {
        const old = { type: 'custom:hue-like-light-card', entity: 'light.a' };
        const result = HueCardEditorSchema.fromFormData({ ...HueCardEditorSchema.toFormData(old), title: '', entities: [] }, old);

        expect(result).toStrictEqual(old);
    });

    it('should keep options not edited by the form', () => {
        const old = { type: 'custom:x', entity: 'light.a', onClickAction: 'scene', onClickData: 'scene.y', card_mod: { style: 'a' } };
        const result = HueCardEditorSchema.fromFormData({ entity: 'light.b', onClickAction: 'scene' }, old);

        expect(result).toStrictEqual({ type: 'custom:x', entity: 'light.b', onClickAction: 'scene', onClickData: 'scene.y', card_mod: { style: 'a' } });
    });

    it('should keep entity objects of remaining entities', () => {
        const old = { entities: ['light.a', { entity: 'light.b', title: 'B' }], scenes: [{ entity: 'scene.x', color: 'red' }] };
        const result = HueCardEditorSchema.fromFormData({ entities: ['light.b', 'light.c'], scenes: ['scene.x', 'scene.z'] }, old);

        expect(result.entities).toStrictEqual([{ entity: 'light.b', title: 'B' }, 'light.c']);
        expect(result.scenes).toStrictEqual([{ entity: 'scene.x', color: 'red' }, 'scene.z']);
    });

    it('should keep empty sceneProvider and store numeric iconSize as number', () => {
        const result = HueCardEditorSchema.fromFormData({ entity: 'light.a', sceneProvider: [], iconSize: '1.7' }, {});

        expect(result.sceneProvider).toStrictEqual([]);
        expect(result.iconSize).toBe(1.7);
    });

    it('should keep empty scenes list set in YAML', () => {
        const old = { entity: 'light.a', scenes: [] };
        const result = HueCardEditorSchema.fromFormData({ ...HueCardEditorSchema.toFormData(old), title: 'T' }, old);

        expect(result.scenes).toStrictEqual([]);
    });

    it('should produce a config the card can parse', () => {
        const result = HueCardEditorSchema.fromFormData({
            ...HueCardEditorSchema.toFormData({}),
            area: 'kitchen',
            iconSize: 'big',
            slider: 'mushroom',
            showSwitch: false,
            offHoldAction: 'hue-screen'
        }, {});

        expect(() => new HueLikeLightCardConfig(result as HueLikeLightCardConfigInterface)).not.toThrow();
    });

    it('should have a label for every field and option', () => {
        const schema = HueCardEditorSchema.getSchema(v => v);
        const keys = Object.keys(en);

        collectNames(schema).forEach(name => expect(keys).toContain(`editor.field.${name}`));

        const options: string[] = [];
        HueCardEditorSchema.getSchema(v => {
            options.push(v);
            return v;
        });
        options.forEach(o => expect(keys).toContain(`editor.option.${o}`));
    });
});
