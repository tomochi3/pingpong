document.addEventListener('DOMContentLoaded', () => {
    const zipcodeImg = document.getElementById('zipcode');
    const searchBtn = document.getElementById('searchBtn');
    const resultArea = document.getElementById('resultArea');
    const addressText = document.getElementById('addressText');
    const errorMsg = document.getElementById('error');
    const loader = document.getElementById('loader');
    const btnText = document.querySelector('.btn-text');

    const searchZipcode = async () => {
        const zipcode = zipcodeImg.value.replace(/-/g, '');
        
        // Reset state
        errorMsg.style.display = 'none';
        resultArea.classList.remove('active');
        
        // Validation
        if (!/^\d{7}$/.test(zipcode)) {
            showError('7桁の数字を入力してください');
            return;
        }

        // Start loading
        setLoading(true);

        try {
            // Using JSONP or a direct fetch if the API supports CORS. 
            // zipcloud supports CORS.
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
            const data = await response.json();

            if (data.status !== 200) {
                showError('サーバーエラーが発生しました');
            } else if (!data.results) {
                showError('該当する住所が見つかりませんでした');
            } else {
                const result = data.results[0];
                const fullAddress = `${result.address1}${result.address2}${result.address3}`;
                addressText.textContent = fullAddress;
                resultArea.classList.add('active');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    };

    const setLoading = (isLoading) => {
        if (isLoading) {
            loader.style.display = 'block';
            btnText.style.opacity = '0.5';
            searchBtn.disabled = true;
        } else {
            loader.style.display = 'none';
            btnText.style.opacity = '1';
            searchBtn.disabled = false;
        }
    };

    searchBtn.addEventListener('click', searchZipcode);
    zipcodeImg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchZipcode();
        }
    });

    // Auto-hyphen removal and length restriction
    zipcodeImg.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^-0-9]/g, '');
    });
});
