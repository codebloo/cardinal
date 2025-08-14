if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput = this.form.querySelector('[name=id]');
        this.variantIdInput.disabled = false;
        this.submitButton = this.querySelector('[type="submit"]');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButtonText = this.submitButton.querySelector('span');
        this.hideErrors = this.dataset.hideErrors === 'true';

        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));

        if (document.querySelector('cart-drawer')) {
          this.submitButton.setAttribute('aria-haspopup', 'dialog');
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        // --- Custom validation for gift card fields ---
        const requiredFields = [
          'recipient_name',
          'loved_one_name',
          'recipient_address',
          'delivery_date',
          'custom_note',
          'sender_name'
        ];

        let hasError = false;
        const today = new Date();
        const minDate = new Date();
        minDate.setDate(today.getDate() + 7);

        requiredFields.forEach(id => {
          const field = document.getElementById(id);
          const error = document.getElementById(`error-${id}`);
          if (!field) return;

          const value = field.value.trim();
          const isDateInvalid = id === 'delivery_date' && new Date(value) < minDate;

          if (!value || isDateInvalid) {
            hasError = true;
            if (error) {
              error.textContent = isDateInvalid ? 'Please choose a date at least 7 days from today.' : 'This field is required.';
              error.classList.remove('hidden');
            }
            field.classList.add('field--error');
          } else {
            if (error) {
              error.textContent = '';
              error.classList.add('hidden');
            }
            field.classList.remove('field--error');
          }
        });

        if (hasError) {
          evt.stopImmediatePropagation();
          return;
        }

        // --- Proceed with regular submission ---
        this.handleErrorMessage();
        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            // ✅ Clear gift-card fields after successful submission
            const giftFields = document.querySelectorAll('.gift-card-options input, .gift-card-options textarea');
            giftFields.forEach(field => {
              field.value = '';
              field.classList.remove('field--error');
              const err = document.getElementById(`error-${field.id}`);
              if (err) {
                err.textContent = '';
                err.classList.add('hidden');
              }
            });

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;

            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }
    }
  );
}
