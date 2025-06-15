const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 全局变量
let currentImageData = null;
let lycheeLogoData = null;

// API密钥 - 从外部配置文件加载
const GEMINI_API_KEY = window.API_CONFIG?.GOOGLE_API_KEY || '';
const TOGETHER_API_KEY = window.API_CONFIG?.TOGETHER_API_KEY || '';
const SEGMIND_API_KEY = window.API_CONFIG?.SEGMIND_API_KEY || '';
const FLUX_KONTEXT_API_KEY = window.API_CONFIG?.FLUX_KONTEXT_API_KEY || '';

// 页面加载完成后初始化画
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    loadLycheeLogoFromFile();
    updateCurrentModelDisplay();
});

// 设置拖拽上传
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
}

// 加载荔枝Logo
async function loadLycheeLogoFromFile() {
    try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            lycheeLogoData = logoBuffer.toString('base64');
            console.log('荔枝Logo加载成功');
        } else {
            console.warn('荔枝Logo文件不存在:', logoPath);
        }
    } catch (error) {
        console.error('加载荔枝Logo失败:', error);
    }
}
async function callGeminiImageGeneration(imageBase64, gender, retryCount = 0) {
    const maxRetries = 3;
    try {
        // 获取性别对应的荔枝守卫提示词
        const genderPrompt = getGenderPrompt(gender);
        
        const prompt = `Based on the user's selfie photo, create a lychee guardian character with the user's facial features. ${genderPrompt} Please incorporate the user's face and facial characteristics into this character design while maintaining the fantasy theme.`;

        if (retryCount === 0) {
            showToast('正在使用Gemini生成荔枝守卫...', 'info');
        } else {
            showToast(`网络重试中... (${retryCount}/${maxRetries})`, 'info');
        }

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseModalities: ["TEXT", "IMAGE"]
            }
        };

        console.log('发送请求到Gemini API:', {
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY.slice(0, 10)}...`,
            bodySize: JSON.stringify(requestBody).length,
            imageDataSize: imageBase64.length,
            logoDataSize: lycheeLogoData.length
        });

        // 现在尝试图像生成请求
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            // 获取详细的错误信息
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                }
                if (errorData.error && errorData.error.code) {
                    errorMessage += ` (Code: ${errorData.error.code})`;
                }
                console.error('Parsed Error:', errorData);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                errorMessage += ` - ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // 详细打印API响应数据
        console.log('Gemini API 完整响应:', JSON.stringify(data, null, 2));
        
        if (!data.candidates) {
            console.error('响应中没有candidates字段');
            throw new Error('API响应格式错误: 缺少candidates字段');
        }
        
        if (!data.candidates[0]) {
            console.error('candidates数组为空');
            throw new Error('API响应格式错误: candidates数组为空');
        }

        const candidate = data.candidates[0];
        console.log('第一个candidate:', JSON.stringify(candidate, null, 2));
        
        if (!candidate.content) {
            console.error('candidate中没有content字段');
            throw new Error('API响应格式错误: candidate缺少content字段');
        }
        
        if (!candidate.content.parts) {
            console.error('content中没有parts字段');
            throw new Error('API响应格式错误: content缺少parts字段');
        }
        
        console.log('content.parts:', JSON.stringify(candidate.content.parts, null, 2));
        
        for (let i = 0; i < candidate.content.parts.length; i++) {
            const part = candidate.content.parts[i];
            console.log(`Part ${i}:`, JSON.stringify(part, null, 2));
            
            // 检查两种可能的字段名称：inline_data 和 inlineData
            if (part.inline_data && part.inline_data.data) {
                console.log('找到图像数据（inline_data），大小:', part.inline_data.data.length);
                showToast('AI图像生成成功！', 'success');
                return `data:image/png;base64,${part.inline_data.data}`;
            }
            
            if (part.inlineData && part.inlineData.data) {
                console.log('找到图像数据（inlineData），大小:', part.inlineData.data.length);
                showToast('AI图像生成成功！', 'success');
                return `data:image/png;base64,${part.inlineData.data}`;
            }
            
            if (part.text) {
                console.log('Part包含文本:', part.text);
            }
        }

        throw new Error('Gemini没有返回生成的图像 - 检查控制台以查看详细响应');
    } catch (error) {
        console.error('Gemini图像生成错误:', error);

        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            (error.message && (
                error.message.includes('ERR_CONNECTION_RESET') ||
                error.message.includes('Network Error')
            ));

        if (isNetworkError && retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            showToast(`网络连接问题，${delay / 1000}秒后重试...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGeminiImageGeneration(imageBase64, gender, retryCount + 1);
        }

        showToast('AI服务暂不可用，请稍后重试', 'error');
        return null;
    }
}

// Together.ai FLUX API调用
async function callTogetherFluxAPI(imageBase64, gender, retryCount = 0) {
    const maxRetries = 3;
    try {
        // 获取性别对应的荔枝守卫提示词
        const genderPrompt = getGenderPrompt(gender);
        
        // 构建包含用户面部特征的提示词
        const prompt = `Create a ${gender === 'male' ? 'male' : 'female'} lychee guardian character incorporating the facial features from the reference image. ${genderPrompt} Maintain the user's distinctive facial characteristics while transforming them into this fantasy character.`;

        if (retryCount === 0) {
            showToast('正在使用FLUX生成荔枝守卫...', 'info');
        } else {
            showToast(`网络重试中... (${retryCount}/${maxRetries})`, 'info');
        }

        // 使用内置的Together.ai API密钥
        const apiKey = TOGETHER_API_KEY;

        const requestBody = {
            model: "black-forest-labs/FLUX.1-kontext-max",
            prompt: prompt,
            steps: 20,
            n: 1,
            response_format: "b64_json"
        };

        console.log('发送请求到Together.ai FLUX API:', {
            model: requestBody.model,
            promptLength: prompt.length,
            steps: requestBody.steps
        });

        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Together.ai API Error Response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                }
            } catch (parseError) {
                errorMessage += ` - ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Together.ai FLUX API 响应:', data);

        if (data.data && data.data[0] && data.data[0].b64_json) {
            showToast('FLUX图像生成成功！', 'success');
            return `data:image/png;base64,${data.data[0].b64_json}`;
        }

        throw new Error('FLUX没有返回生成的图像');
    } catch (error) {
        console.error('Together.ai FLUX生成错误:', error);

        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            (error.message && (
                error.message.includes('ERR_CONNECTION_RESET') ||
                error.message.includes('Network Error')
            ));

        if (isNetworkError && retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            showToast(`网络连接问题，${delay / 1000}秒后重试...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, delay));
            return callTogetherFluxAPI(imageBase64, gender, retryCount + 1);
        }

        showToast('FLUX服务暂不可用，请稍后重试', 'error');
        return null;
    }
}

// Segmind API调用
async function callSegmindAPI(imageBase64, gender, retryCount = 0) {
    const maxRetries = 3;
    try {
        // 获取性别对应的荔枝守卫提示词
        const genderPrompt = getGenderPrompt(gender);
        
        // 构建包含用户面部特征的提示词
        const prompt = `Create a ${gender === 'male' ? 'male' : 'female'} lychee guardian character incorporating the facial features from the reference image. ${genderPrompt} Maintain the user's distinctive facial characteristics while transforming them into this fantasy character. Highly detailed, fantasy art style, vibrant colors.`;

        if (retryCount === 0) {
            showToast('正在使用Segmind生成荔枝守卫...', 'info');
        } else {
            showToast(`网络重试中... (${retryCount}/${maxRetries})`, 'info');
        }

        // 使用内置的Segmind API密钥
        const apiKey = SEGMIND_API_KEY;
        
        // 创建FormData
        const formData = new FormData();
        
        // 将base64转换为Blob
        const imageBlob = await base64ToBlob(imageBase64);
        formData.append('image', imageBlob, 'input.jpg');
        formData.append('prompt', prompt);
        formData.append('negative_prompt', 'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs');
        formData.append('samples', '1');
        formData.append('steps', '20');
        formData.append('cfg_scale', '7.5');
        formData.append('seed', '-1');
        formData.append('img_width', '512');
        formData.append('img_height', '512');
        formData.append('scheduler', 'DPM++ 2M Karras');
        formData.append('strength', '0.8');

        console.log('发送请求到Segmind API:', {
            promptLength: prompt.length,
            imageBlobSize: imageBlob.size
        });

        const response = await fetch('https://api.segmind.com/v1/sd1.5-img2img', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Segmind API Error Response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage += ` - ${errorData.error}`;
                }
                if (errorData.message) {
                    errorMessage += ` - ${errorData.message}`;
                }
            } catch (parseError) {
                errorMessage += ` - ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        // Segmind API返回的是直接的图像数据
        const imageBuffer = await response.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        console.log('Segmind API 响应成功, 图像大小:', imageBuffer.byteLength);

        showToast('Segmind图像生成成功！', 'success');
        return `data:image/png;base64,${base64Image}`;
        
    } catch (error) {
        console.error('Segmind生成错误:', error);

        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            (error.message && (
                error.message.includes('ERR_CONNECTION_RESET') ||
                error.message.includes('Network Error')
            ));

        if (isNetworkError && retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            showToast(`网络连接问题，${delay / 1000}秒后重试...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, delay));
            return callSegmindAPI(imageBase64, gender, retryCount + 1);
        }

        showToast('Segmind服务暂不可用，请稍后重试', 'error');
        return null;
    }
}

// 将base64转换为Blob的辅助函数
async function base64ToBlob(base64) {
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    return response.blob();
}

// FLUX Kontext Pro API调用 (Replicate)
async function callFluxKontextAPI(imageBase64, gender, retryCount = 0) {
    const maxRetries = 3;
    try {
        // 获取性别对应的荔枝守卫提示词
        const genderPrompt = getGenderPrompt(gender);
        
        // 构建图像编辑提示词
        const prompt = `Transform this portrait into a ${gender === 'male' ? 'male' : 'female'} lychee guardian character while maintaining the person's facial features and expression. ${genderPrompt} Keep the original face structure and characteristics but style them as this fantasy character. High quality, detailed fantasy art style.`;

        if (retryCount === 0) {
            showToast('正在使用FLUX Kontext Pro生成荔枝守卫...', 'info');
        } else {
            showToast(`网络重试中... (${retryCount}/${maxRetries})`, 'info');
        }

        // 将base64转换为临时的data URL
        const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

        console.log('发送请求到FLUX Kontext Pro API:', {
            model: 'black-forest-labs/flux-kontext-pro',
            promptLength: prompt.length,
            imageDataSize: imageBase64.length
        });

        const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLUX_KONTEXT_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: {
                    prompt: prompt,
                    input_image: imageDataUrl,
                    aspect_ratio: "3:4",
                    output_format: "jpg",
                    safety_tolerance: 2
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('FLUX Kontext Pro API Error Response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.detail) {
                    errorMessage += ` - ${errorData.detail}`;
                }
                if (errorData.error) {
                    errorMessage += ` - ${errorData.error}`;
                }
            } catch (parseError) {
                errorMessage += ` - ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const predictionData = await response.json();
        console.log('FLUX Kontext Pro 预测创建成功:', predictionData);

        // 轮询预测结果
        const predictionId = predictionData.id;
        let result = null;
        let attempts = 0;
        const maxAttempts = 60; // 最多等待60次，每次2秒

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
            
            try {
                const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                    headers: {
                        'Authorization': `Bearer ${FLUX_KONTEXT_API_KEY}`,
                    }
                });

                if (!statusResponse.ok) {
                    console.warn(`状态检查失败 (attempt ${attempts + 1}): ${statusResponse.status}`);
                    attempts++;
                    continue; // 继续重试，不抛出错误
                }

                const statusData = await statusResponse.json();
                console.log('FLUX Kontext Pro 状态:', statusData.status);

                if (statusData.status === 'succeeded') {
                    result = statusData.output;
                    break;
                } else if (statusData.status === 'failed') {
                    throw new Error(`Prediction failed: ${statusData.error || 'Unknown error'}`);
                }
            } catch (fetchError) {
                console.warn(`状态检查网络错误 (attempt ${attempts + 1}):`, fetchError.message);
                // 轮询过程中的网络错误不应该导致整个函数重试
            }

            attempts++;
            if (attempts % 5 === 0) {
                showToast(`正在生成中... (${attempts * 2}秒)`, 'info');
            }
        }

        if (!result) {
            throw new Error('FLUX Kontext Pro 生成超时');
        }

        // 下载图片并转换为base64
        const imageResponse = await fetch(result);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download generated image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        console.log('FLUX Kontext Pro 生成成功, 图像大小:', imageBuffer.byteLength);

        showToast('FLUX Kontext Pro图像生成成功！', 'success');
        return `data:image/jpeg;base64,${base64Image}`;
        
    } catch (error) {
        console.error('FLUX Kontext Pro生成错误:', error);

        // 只有在初始API调用失败时才重试，轮询失败不重试
        const isInitialRequestError = error.message.includes('HTTP error!') && 
                                     !error.message.includes('Prediction failed') && 
                                     !error.message.includes('生成超时') &&
                                     !error.message.includes('Failed to download');

        const isNetworkError = error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            (error.message && (
                error.message.includes('ERR_CONNECTION_RESET') ||
                error.message.includes('Network Error')
            ));

        if (isInitialRequestError && isNetworkError && retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            showToast(`网络连接问题，${delay / 1000}秒后重试...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, delay));
            return callFluxKontextAPI(imageBase64, gender, retryCount + 1);
        }

        showToast('FLUX Kontext Pro服务暂不可用，请稍后重试', 'error');
        return null;
    }
}

// 选择图片
async function selectImage() {
    try {
        const result = await ipcRenderer.invoke('select-image');
        if (result) {
            currentImageData = result;
            displayImage(result);
            showProcessSection();
        }
    } catch (error) {
        showToast('选择图片失败: ' + error.message, 'error');
    }
}

// 处理图片文件
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        // 压缩图片
        compressImage(e.target.result, (compressedDataUrl) => {
            const imageData = {
                data: compressedDataUrl.split(',')[1], // 移除data URL前缀
                name: file.name,
                path: file.name
            };
            currentImageData = imageData;
            displayImage(imageData);
            showProcessSection();
        });
    };
    reader.readAsDataURL(file);
}

// 压缩图片函数
function compressImage(dataUrl, callback, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算新的尺寸，保持宽高比
        let { width, height } = img;
        
        if (width > height) {
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为压缩后的数据URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        console.log(`图片压缩: ${img.width}x${img.height} -> ${width}x${height}`);
        console.log(`文件大小压缩: ${dataUrl.length} -> ${compressedDataUrl.length} 字符`);
        
        callback(compressedDataUrl);
    };
    img.src = dataUrl;
}

// 显示图片
function displayImage(imageData) {
    const originalImage = document.getElementById('originalImage');
    originalImage.src = `data:image/jpeg;base64,${imageData.data}`;
}

// 显示处理区域
function showProcessSection() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('processSection').style.display = 'block';
}

// 生成头像
async function generateAvatar() {
    if (!currentImageData) {
        showToast('请先上传图片', 'error');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.loading-spinner');

    generateBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline';

    try {
        const gender = document.querySelector('input[name="gender"]:checked').value;
        
        // 获取用户选择的API提供商
        const apiProvider = localStorage.getItem('apiProvider') || 'gemini';
        
        let generatedImage;
        switch (apiProvider) {
            case 'flux':
                generatedImage = await callTogetherFluxAPI(currentImageData.data, gender);
                break;
            case 'segmind':
                generatedImage = await callSegmindAPI(currentImageData.data, gender);
                break;
            case 'flux-kontext':
                generatedImage = await callFluxKontextAPI(currentImageData.data, gender);
                break;
            default:
                generatedImage = await callGeminiImageGeneration(currentImageData.data, gender);
                break;
        }

        if (generatedImage) {
            displayGeneratedImage(generatedImage);
            showToast('荔枝守卫生成成功！⚔️', 'success');
        } else {
            showToast('荔枝守卫生成失败，请重试', 'error');
        }
    } catch (error) {
        console.error('生成失败:', error);
        showToast('生成失败: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// 显示生成的图片
function displayGeneratedImage(imageDataUrl) {
    const generatedImage = document.getElementById('generatedImage');
    const resultPlaceholder = document.getElementById('resultPlaceholder');
    const resultActions = document.getElementById('resultActions');
    
    generatedImage.src = imageDataUrl;
    generatedImage.style.display = 'block';
    resultPlaceholder.style.display = 'none';
    resultActions.style.display = 'flex';
    
    // 保存生成的图片数据用于下载
    generatedImage.dataset.imageData = imageDataUrl;
}

// 下载图片
async function downloadImage() {
    const generatedImage = document.getElementById('generatedImage');
    const imageData = generatedImage.dataset.imageData;
    
    if (!imageData) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `lychee-avatar-${timestamp}.png`;
        
        const result = await ipcRenderer.invoke('save-image', imageData, fileName);
        
        if (result.success) {
            showToast('图片保存成功！', 'success');
        } else {
            showToast('保存失败: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('保存失败: ' + error.message, 'error');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 重置应用（返回上传界面）
function resetApp() {
    currentImageData = null;
    document.getElementById('processSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('generatedImage').style.display = 'none';
    document.getElementById('resultPlaceholder').style.display = 'flex';
    document.getElementById('resultActions').style.display = 'none';
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.metaKey && e.key === 'o') {
        e.preventDefault();
        selectImage();
    }
    if (e.metaKey && e.key === 'r') {
        e.preventDefault();
        resetApp();
    }
});

// Camera functionality
let cameraStream = null;

// Show prompt settings modal
function showPromptSettings() {
    const modal = document.getElementById('promptSettingsModal');
    modal.style.display = 'flex';
}

// Hide prompt settings modal
function hidePromptSettings() {
    const modal = document.getElementById('promptSettingsModal');
    modal.style.display = 'none';
}

// Show privacy info modal
function showPrivacyInfo() {
    const modal = document.getElementById('privacyModal');
    modal.style.display = 'flex';
}

// Hide privacy info modal
function hidePrivacyInfo() {
    const modal = document.getElementById('privacyModal');
    modal.style.display = 'none';
}

// Get gender-specific prompt for lychee guardian
function getGenderPrompt(gender) {
    switch(gender) {
        case 'male':
            return 'Picture a tall, athletic 18-year-old male fantasy knight, embodying a lychee spirit, in a full-body portrait. His messy, windswept hair fades from wine-red to pink, framing deep red eyes. He\'s clad in elegant fantasy armor, its surface intricately patterned and textured like the rough, bumpy exterior of a lychee shell(wine-red color), worn over Eastern robes. A layered cloak that mimics dried fruit skin flows behind him as he grasps a curved leaf-blade shimmering with a watery mist. The artwork is in an elegant fantasy style with a strong nature theme.';
        case 'female':
            return 'A full-body portrait of an 18-year-old female fantasy knight, lychee spirit, tall and athletic. She has messy, windswept hair with a wine-red to pink gradient, and deep red eyes. She is wearing elegant fantasy armor over robes, ts surface intricately patterned and textured like the rough, bumpy exterior of a lychee shell((wine-red color)), with a layered cloak that looks like dried fruit skin. She holds a curved leaf-blade glowing with a watery mist. The style should be elegant fantasy art with a nature theme.';
        default:
            return 'A full-body portrait of an 18-year-old fantasy character with lychee theme, incorporating the user\'s facial features.';
    }
}

// Camera functionality
async function capturePhoto() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');
    const captureBtn = document.getElementById('captureBtn');
    const cameraStatus = document.getElementById('cameraStatus');
    
    if (!modal || !video || !captureBtn) {
        console.error('Camera modal elements not found');
        showToast('摄像头界面加载失败', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    cameraStatus.textContent = '正在启动摄像头...';
    
    try {
        // 请求摄像头权限
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // 前置摄像头
            } 
        });
        
        video.srcObject = cameraStream;
        video.play();
        
        // 等待视频加载完成后启用拍照按钮
        video.addEventListener('loadedmetadata', () => {
            captureBtn.disabled = false;
            cameraStatus.textContent = '摄像头已就绪，点击拍摄按钮拍照';
        });
        
    } catch (error) {
        console.error('无法访问摄像头:', error);
        cameraStatus.textContent = '摄像头启动失败';
        showToast('无法访问摄像头，请检查权限设置', 'error');
        hideCamera();
    }
}

// Hide camera modal and stop stream
function hideCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    const modal = document.getElementById('cameraModal');
    const captureBtn = document.getElementById('captureBtn');
    modal.style.display = 'none';
    captureBtn.disabled = true;
}

// Take picture from camera
function takePicture() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        showToast('摄像头未就绪，请稍后再试', 'error');
        return;
    }
    
    // 设置画布尺寸与视频相同
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制当前视频帧到画布
    ctx.drawImage(video, 0, 0);
    
    // 获取图片数据
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // 压缩图片并转换为正确的格式
    compressImage(imageDataUrl, (compressedDataUrl) => {
        // 转换为与其他上传方式一致的格式
        const imageData = {
            data: compressedDataUrl.split(',')[1], // 移除data URL前缀
            name: `camera-photo-${Date.now()}.jpg`,
            path: 'camera-capture'
        };
        
        currentImageData = imageData;
        displayImage(imageData);
        showProcessSection();
        hideCamera();
        showToast('照片拍摄成功！', 'success');
    });
}

// Settings modal functions
function showSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    loadAPISettings();
}

function hideSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

function loadAPISettings() {
    const savedProvider = localStorage.getItem('apiProvider') || 'gemini';
    
    // 设置选中的API提供商
    const providerRadios = document.querySelectorAll('input[name="apiProvider"]');
    providerRadios.forEach(radio => {
        radio.checked = radio.value === savedProvider;
    });
}

function saveSettings() {
    const apiProvider = document.querySelector('input[name="apiProvider"]:checked').value;
    const currentProvider = localStorage.getItem('apiProvider') || 'gemini';
    
    // 保存API提供商选择
    localStorage.setItem('apiProvider', apiProvider);
    
    // 更新模型显示
    updateCurrentModelDisplay();
    
    // 显示确认信息
    if (currentProvider !== apiProvider) {
        let modelName;
        switch (apiProvider) {
            case 'flux':
                modelName = 'FLUX 1.1 Pro';
                break;
            case 'segmind':
                modelName = 'Segmind PixelFlow';
                break;
            case 'flux-kontext':
                modelName = 'FLUX Kontext Pro';
                break;
            default:
                modelName = 'Google Gemini 2.0 Flash';
                break;
        }
        showToast(`已切换到 ${modelName} 模型`, 'success');
    } else {
        showToast('设置已确认', 'info');
    }
    
    hideSettings();
}

// 更新当前模型显示
function updateCurrentModelDisplay() {
    const currentModelElement = document.getElementById('currentModel');
    if (currentModelElement) {
        const apiProvider = localStorage.getItem('apiProvider') || 'gemini';
        let modelName;
        switch (apiProvider) {
            case 'flux':
                modelName = 'FLUX 1.1 Pro';
                break;
            case 'segmind':
                modelName = 'Segmind PixelFlow';
                break;
            case 'flux-kontext':
                modelName = 'FLUX Kontext Pro';
                break;
            default:
                modelName = 'Google Gemini 2.0 Flash';
                break;
        }
        currentModelElement.textContent = `当前模型: ${modelName}`;
    }
}

// 重新上传相关函数
function showReuploadOptions() {
    const modal = document.getElementById('reuploadModal');
    modal.style.display = 'flex';
}

function hideReuploadOptions() {
    const modal = document.getElementById('reuploadModal');
    modal.style.display = 'none';
}

// 选择新图片
async function selectNewImage() {
    hideReuploadOptions();
    try {
        const result = await ipcRenderer.invoke('select-image');
        if (result) {
            currentImageData = result;
            displayImage(result);
            
            // 重置生成结果区域
            document.getElementById('generatedImage').style.display = 'none';
            document.getElementById('resultPlaceholder').style.display = 'flex';
            document.getElementById('resultActions').style.display = 'none';
            
            showToast('新图片已上传，可以重新生成！', 'success');
        }
    } catch (error) {
        showToast('选择图片失败: ' + error.message, 'error');
    }
}

// 重新拍摄照片
function captureNewPhoto() {
    hideReuploadOptions();
    capturePhoto();
}
