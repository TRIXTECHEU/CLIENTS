window.FileUploadExtension = {
  name: 'FileUpload',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'ext_fileUpload' || (trace.payload && trace.payload.name === 'ext_fileUpload'),

  render: ({ trace, element }) => {
    const wrapper = document.createElement('div');
    let fileUploaded = false;
    let interactionDone = false;

    wrapper.innerHTML = `
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

      .file-upload-box {
        border: 2px dashed #00CC6D; /* svetlejší zelená #00CC6D */
        background-color: #DBFAD1; /* světlá zelená */
        border-radius: 10px;
        padding: clamp(15px, 3vw, 20px);
        text-align: center;
        transition: all 0.3s ease;
        font-family: Poppins;
        max-width: 100%;
        box-sizing: border-box;
        margin: 0 auto;
      }

      .file-upload-box.dragover {
        background-color: #B6F4A4; /* světlá zelená, ponecháno */
        border-color: #009952; /* střední zelená #009952 */
      }

      .file-upload-box.success {
        background-color: #EDFCE8;
        border-color: #00703C; /* tmavší zelená #00703C */
        opacity: 0.7;
      }

      .file-upload-box.error {
        background-color: #ffe6e6;
        border-color: #cc0000;
      }

      .file-upload-box img.upload-icon {
        width: clamp(40px, 10vw, 50px);
        height: clamp(40px, 10vw, 50px);
        object-fit: contain;
        pointer-events: none;
        user-select: none;
      }

      .file-upload-status {
        font-weight: bold;
        margin-top: 0.5em;
        font-size: 12px;
      }

      .file-upload-box.success .file-upload-status {
        color: #2C8910;
      }

      .file-upload-box.error .file-upload-status {
        color: #cc0000;
      }

      .cancel-wrapper {
        text-align: center;
        margin-top: 0.5em;
        display: flex;
        justify-content: center;
      }

      .cancel-button {
        background-color: #e94f77;
        color: white;
        border: none;
        padding: 0.6em 10.5em;
        font-size: clamp(10px, 3vw, 11px);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: Poppins;
        width: auto;
        max-width: none;
        margin: 0;
        display: inline-block;
        letter-spacing: normal;
        white-space: nowrap;
      }

      .cancel-button:hover {
        background-color: #d84368;
      }

      .disabled-opacity {
        opacity: 0.6;
        pointer-events: none;
      }

      .file-upload-box > div {
        font-size: 12px;
        margin-top: 0.3em;
        margin-bottom: 0.3em;
      }

      .file-upload-box > div strong {
        font-size: 12px;
      }

      @media (max-width: 400px) {
        .file-upload-box {
          padding: 12px;
        }
        .cancel-button {
          padding: 0.5em 20px;
        }
      }
      </style>

      <div class="file-upload-box">
        <img src="https://i.imgur.com/YAP68Cf.png" class="upload-icon" />
        <div style="margin-top:5px; font-size:13px;"><strong>Presuňte a pustite sem</strong></div>
        <div style="margin-bottom:5px; font-size:11px;">Maximálna veľkosť: <strong>30MB</strong></div>
        <input type="file" style="display:none" />
        <div class="file-upload-status"></div>
      </div>
      <div class="cancel-wrapper">
        <button class="cancel-button">Preskočiť</button>
      </div>
    `;

    const box = wrapper.querySelector('.file-upload-box');
    const input = wrapper.querySelector('input[type=file]');
    const status = wrapper.querySelector('.file-upload-status');
    const cancel = wrapper.querySelector('.cancel-button');
    const icon = wrapper.querySelector('.upload-icon');

    const disableAll = () => {
      wrapper.classList.add('disabled-opacity');
    };

    const handleFile = async (file) => {
      if (!file || interactionDone) return;

      if (file.size > 30 * 1024 * 1024) {
        status.innerHTML = 'Súbor je príliš veľký (limit 30 MB)!';
        box.classList.remove('success');
        box.classList.add('error');
        return;
      }

      status.innerHTML = '⬆ Nahrávam...';
      box.classList.remove('error');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'voiceflow_upload');
      formData.append('folder', 'voiceflow_uploads');

      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/del00w7dj/auto/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!data.secure_url) {
          throw new Error('Chyba pri nahrávaní na Cloudinary.');
        }

        const fileUrl = data.secure_url;

        box.classList.add('success');
        status.innerHTML = 'Súbor bol úspešne nahraný!';
        input.disabled = true;
        fileUploaded = true;
        interactionDone = true;
        disableAll();

        if (window.voiceflow?.chat?.interact) {
          window.voiceflow.chat.interact({
            type: 'complete',
            payload: {
              file: fileUrl,
              name: file.name,
              type: file.type,
              size: file.size,
            },
          });
        }
      } catch (err) {
        console.error(err);
        box.classList.add('error');
        status.innerHTML = '❌ Chyba pri nahrávaní.';
      }
    };

    box.addEventListener('click', () => {
      if (!input.disabled) input.click();
    });

    input.addEventListener('change', () => handleFile(input.files[0]));

    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!input.disabled) box.classList.add('dragover');
    });

    box.addEventListener('dragleave', () => {
      if (!input.disabled) box.classList.remove('dragover');
    });

    box.addEventListener('drop', (e) => {
      e.preventDefault();
      if (input.disabled) return;
      box.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });

    cancel.addEventListener('click', () => {
      if (interactionDone) return;
      interactionDone = true;
      disableAll();

      if (window.voiceflow?.chat?.interact) {
        window.voiceflow.chat.interact({
          type: 'cancel',
          payload: { cancelled: true },
        });
      }
    });

    element.appendChild(wrapper);
  },
};
