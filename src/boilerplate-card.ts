import { LitElement, html, customElement, property, CSSResult, TemplateResult, css, PropertyValues } from 'lit-element';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers';

import './editor';

import { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';
import { HassEntity } from 'home-assistant-js-websocket';

/* eslint no-console: 0 */
console.info(
  `%c  BOILERPLATE-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'boilerplate-card',
  name: 'Boilerplate Card',
  description: 'A template custom card for you to create something awesome',
});

var myGuard = 1;

export function hasChangedCustom(el: HassEntity): boolean {
  console.log(JSON.stringify('hasChangedCustom'));
  console.log(JSON.stringify(el));
  return true;
}

// TODO Name your custom element
@customElement('boilerplate-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('boilerplate-card-editor');
  }

  public static getStubConfig(): object {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  @property() public hass!: HomeAssistant;
  @property() private config!: BoilerplateCardConfig;
  @property({ hasChanged: hasChangedCustom }) private entity?: HassEntity;

  public setConfig(config: BoilerplateCardConfig): void {
    // TODO Check for required fields and that they are of the proper format

    //console.log(JSON.stringify(config));

    if (!config || config.show_error) {
      throw new Error(localize('common.invalid_configuration'));
    }

    let errorText = '';

    if (!config.title) {
      errorText += 'title ';
    }

    if (!config.entities) {
      errorText += ' entities';
    }

    if (!Array.isArray(config.entities)) {
      errorText += ' entities need to be an array ';
    }

    if (errorText != '') {
      throw new Error('You need to define the following elements: ' + errorText);
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'BoilerplateXXX',
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    //console.log(JSON.stringify(changedProps));
    return true;
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected render(): TemplateResult | void {

    if (myGuard) {
      myGuard = 0;

      this.entity = this.hass.states[this.config.entities[0]];
      //console.log(JSON.stringify(this.entity));

      //console.log(JSON.stringify(this.hass));
      //console.log(JSON.stringify(this.hass.states['sensor.homee_thermostat_1']));
    }

    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this.showWarning(localize('common.show_warning'));
    }

    return html`
      <ha-card
        .header=${this.config.title}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${``}
        })}
      >
        ${this.config.entities.map((ent, i) => html`
          <div>
            ${i}:${ent}
          </<div>
        `)}
        ${this.config.entities.map((ent, i) => {
          const stateObj = this.hass.states[ent];
          return html`
            <div>
              ${i}:${stateObj.attributes.friendly_name}
            </<div>
          `})}
        ${this.config.entities.map((ent) => {
        const stateObj = this.hass.states[ent];
          return html`
          <div>Thermostat: ${stateObj.attributes.name}</<div>
          <div>Soll Temperatur: ${stateObj.attributes.targettemperature.toFixed(1)}</<div>
          <div>Ist Temperatur: ${stateObj.attributes.temperature.toFixed(1)}</<div>
        `})}
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  static get styles(): CSSResult {
    return css``;
  }
}
