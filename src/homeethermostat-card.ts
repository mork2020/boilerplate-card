import { LitElement, html, customElement, property, CSSResult, TemplateResult, css, PropertyValues } from 'lit-element';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCard,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers';

import './editor';

import { HomeeThermostatCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';
import { HassEntity } from 'home-assistant-js-websocket';

/* eslint no-console: 0 */
console.info(
  `%c  Homee-Thermostat-Card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'homeethermostat-card',
  name: 'Homee-Thermostat Card',
  description: 'A custom card to show thermostat infos from a Homee. Needs Node-Red to talk to Homee.',
});

let myGuard = 1;

// TODO Name your custom element
@customElement('homeethermostat-card')
export class HomeeThermostatCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('homeethermostat-card-editor');
  }

  public static getStubConfig(): object {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  @property() public hass!: HomeAssistant;
  @property() private config!: HomeeThermostatCardConfig;
  @property() private myEntities!: Array<HassEntity>;

  public setConfig(config: HomeeThermostatCardConfig): void {
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
    } else if (!Array.isArray(config.entities)) {
      errorText += ' entities need to be an array ';
    }

    if (errorText != '') {
      throw new Error('You need to define the following elements: ' + errorText);
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'HomeeThermostatCard',
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    console.log(JSON.stringify(changedProps));
    return true;
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  private _checkforStateObj(): [boolean, TemplateResult] {
    // check if for all entities stateObj extits
    // if not create error-card
    this.myEntities = new Array<HassEntity>();
    let errorText = '';
    this.config.entities.map(ent => {
      const stateObj = this.hass.states[ent];
      if (!stateObj) {
        errorText += ent;
      } else {
        this.myEntities.push(stateObj);
      }
    });
    if (errorText != '') {
      //this.config.show_warning = true;
      //throw new Error('The following entities cannot be found: ' + errorText);
      const errorCard = document.createElement('hui-error-card') as LovelaceCard;
      errorCard.setConfig({
        type: 'error',
        error: 'The following entities cannot be found: ' + errorText,
        origConfig: this.config,
      });
      return [
        false,
        html`
          ${errorCard}
        `,
      ];
    }

    return [true, html``];
  }

  private _cardHtml(): TemplateResult {
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
        ${this.config.entities.map(
          (ent, i) => html`
          <div>
            ${i}:${ent}
          </<div>
        `,
        )}
        ${this.config.entities.map((ent, i) => {
          const stateObj = this.hass.states[ent];
          return html`
            <div>
              ${i}:${stateObj.attributes.friendly_name}
            </<div>
          `;
        })}
        ${this.config.entities.map(ent => {
          const stateObj = this.hass.states[ent];
          return html`
          <div>Thermostat: ${stateObj.attributes.name}</<div>
          <div>Soll Temperatur: ${stateObj.attributes.targettemperature.toFixed(1)}</<div>
          <div>Ist Temperatur: ${stateObj.attributes.temperature.toFixed(1)}</<div>
        `;
        })}
      </ha-card>
    `;
  }

  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    // check stateObj
    const checkRes = this._checkforStateObj();
    if (!checkRes[0]) {
      return checkRes[1];
    }

    if (myGuard) {
      myGuard = 0;

      console.log(JSON.stringify(this.myEntities));
      //this.myentity = this.hass.states[this.config.entities[0]];
      //console.log(JSON.stringify(this.entity));

      //console.log(JSON.stringify(this.hass));
      //console.log(JSON.stringify(this.hass.states['sensor.homee_thermostat_1']));
    }

    //if (this.config.show_warning) {
    //  return this.showWarning(localize('common.show_warning'));
    //}

    try {
      return this._cardHtml();
    } catch (e) {
      if (e.stack) console.error(e.stack);
      else console.error(e);
      const errorCard = document.createElement('hui-error-card') as LovelaceCard;
      errorCard.setConfig({
        type: 'error',
        error: e.toString(),
        origConfig: this.config,
      });
      return html`
        ${errorCard}
      `;
    }
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
