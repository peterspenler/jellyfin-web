define(['dialogHelper', 'layoutManager', 'scrollHelper', 'globalize', 'require', 'material-icons', 'emby-button', 'paper-icon-button-light', 'emby-input', 'formDialogStyle'], function (dialogHelper, layoutManager, scrollHelper, globalize, require) {

    function setInputProperties(dlg, options) {
        var txtInput = dlg.querySelector('#txtInput');
        txtInput.value = options.value || '';
        txtInput.label(options.label || '');
    }

    function showDialog(options, template) {

        var dialogOptions = {
            removeOnClose: true,
            scrollY: false
        };

        if (layoutManager.tv) {
            dialogOptions.size = 'fullscreen';
        } else {
            //dialogOptions.size = 'mini';
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('formDialog');

        dlg.innerHTML = globalize.translateHtml(template, 'sharedcomponents');

        if (layoutManager.tv) {
            scrollHelper.centerFocus.on(dlg.querySelector('.formDialogContent'), false);
        } else {
            dlg.querySelector('.dialogContentInner').classList.add('dialogContentInner-mini');
        }

        dlg.querySelector('.btnCancel').addEventListener('click', function (e) {
            dialogHelper.close(dlg);
        });

        dlg.querySelector('.dialogContentTitle').innerHTML = options.title || '';

        if (options.description) {
            dlg.querySelector('.fieldDescription').innerHTML = options.description;
        } else {
            dlg.querySelector('.fieldDescription').classList.add('hide');
        }

        setInputProperties(dlg, options);

        var submitValue;

        dlg.querySelector('form').addEventListener('submit', function (e) {

            submitValue = dlg.querySelector('#txtInput').value;
            e.preventDefault();
            e.stopPropagation();

            // Important, don't close the dialog until after the form has completed submitting, or it will cause an error in Chrome
            setTimeout(function () {
                dialogHelper.close(dlg);
            }, 300);

            return false;
        });

        return dialogHelper.open(dlg).then(function () {

            if (layoutManager.tv) {
                scrollHelper.centerFocus.off(dlg.querySelector('.formDialogContent'), false);
            }

            var value = submitValue;

            if (value) {
                return value;
            } else {
                return Promise.reject();
            }
        });
    }

    return function (options) {

        return new Promise(function (resolve, reject) {
            require(['text!./prompt.template.html'], function (template) {

                if (typeof options === 'string') {
                    options = {
                        title: '',
                        text: options
                    };
                }
                showDialog(options, template).then(resolve, reject);
            });
        });
    };
});