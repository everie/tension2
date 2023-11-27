(function () {
    GetSettings();
    FillForm();
})();

function FillForm() {
    let NumberFormat = document.querySelectorAll('.radio-field[name="number-format"]');
    let DateFormat = document.querySelectorAll('.radio-field[name="date-format"]');
    let DateSeparator = document.querySelectorAll('.radio-field[name="date-separator"]');

    let DateExample = document.querySelector('.date-example');
    let NumberExample = document.querySelector('.number-example');

    DateExample.innerHTML = GetReadableTimestamp(Date.now(), true);
    NumberExample.innerHTML = FormatNumber(1234567.89, false);


    DateFormat.forEach(a => {
        a.addEventListener('change', function( ) {
            let e = this;
            let val = e.value;

            if (Current.Settings.Options.DateFormat.some(a => a.Value === val))
                SetSetting('DATE', val);

            DateExample.innerHTML = GetReadableTimestamp(Date.now(), true);
        });
    });

    DateSeparator.forEach(a => {
        a.addEventListener('change', function( ) {
            let e = this;
            let val = e.value;

            if (Current.Settings.Options.DateSeparator.some(a => a.Value === val))
                SetSetting('SEPARATOR', val);

            DateExample.innerHTML = GetReadableTimestamp(Date.now(), true);
        });
    });

    NumberFormat.forEach(a => {
        a.addEventListener('change', function( ) {
            let e = this;
            let val = e.value;

            if (Current.Settings.Options.NumberFormat.some(a => a.Value === val))
                SetSetting('NUMBER', val);

            NumberExample.innerHTML = FormatNumber(1234567.89, false);
        });
    });
}