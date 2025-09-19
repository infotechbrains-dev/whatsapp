'use client';

import { useState, useEffect } from 'react';
import { DevicePhoneMobileIcon, PlayIcon, DocumentIcon } from '@heroicons/react/24/outline';

const WhatsAppPreview = ({ templateData }) => {
  const [previewData, setPreviewData] = useState({
    headerType: 'NONE',
    headerText: '',
    headerMedia: null,
    bodyText: '',
    footerText: '',
    buttons: []
  });

  useEffect(() => {
    if (templateData) {
      setPreviewData(templateData);
    }
  }, [templateData]);

  const renderHeaderPreview = () => {
    if (!previewData.headerType || previewData.headerType === 'NONE') {
      return null;
    }

    switch (previewData.headerType) {
      case 'TEXT':
        return (
          <div className="px-4 py-2 bg-green-50">
            <p className="text-sm font-medium text-gray-800">
              {previewData.headerText || 'Header text will appear here'}
            </p>
          </div>
        );

      case 'IMAGE':
        return (
          <div className="relative">
            {previewData.headerMedia && previewData.headerMedia.s3Url ? (
              <img 
                src={previewData.headerMedia.s3Url} 
                alt="Header media"
                className="w-full h-48 object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <div className="text-center">
                  <DevicePhoneMobileIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Image will appear here</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'VIDEO':
        return (
          <div className="relative">
            {previewData.headerMedia && previewData.headerMedia.s3Url ? (
              <div className="relative">
                <video 
                  src={previewData.headerMedia.s3Url} 
                  className="w-full h-48 object-cover rounded-t-lg"
                  poster={previewData.headerMedia.thumbnailUrl}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 rounded-full p-3">
                    <PlayIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <div className="text-center">
                  <PlayIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Video will appear here</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'DOCUMENT':
        return (
          <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-400">
            <div className="flex items-center">
              <DocumentIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {previewData.headerMedia?.originalName || 'Document.pdf'}
                </p>
                <p className="text-xs text-blue-600">
                  {previewData.headerMedia?.size ? `${Math.round(previewData.headerMedia.size / 1024)} KB` : '125 KB'}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderBodyPreview = () => {
    if (!previewData.bodyText) {
      return (
        <div className="px-4 py-2">
          <p className="text-sm text-gray-400 italic">
            Body text will appear here...
          </p>
        </div>
      );
    }

    // Replace template variables with sample values
    let bodyText = previewData.bodyText;
    const variables = bodyText.match(/{{(\d+)}}/g) || [];
    variables.forEach((variable, index) => {
      const placeholder = `Sample${index + 1}`;
      bodyText = bodyText.replace(variable, `*${placeholder}*`);
    });

    return (
      <div className="px-4 py-2">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {bodyText}
        </p>
      </div>
    );
  };

  const renderFooterPreview = () => {
    if (!previewData.footerText) {
      return null;
    }

    return (
      <div className="px-4 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {previewData.footerText}
        </p>
      </div>
    );
  };

  const renderButtonsPreview = () => {
    if (!previewData.buttons || previewData.buttons.length === 0) {
      return null;
    }

    return (
      <div className="px-4 py-2 border-t border-gray-100 space-y-2">
        {previewData.buttons.map((button, index) => (
          <div key={index} className="w-full">
            {button.type === 'URL' && (
              <button className="w-full py-2 px-3 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-colors">
                🔗 {button.text || 'Visit Website'}
              </button>
            )}
            {button.type === 'QUICK_REPLY' && (
              <button className="w-full py-2 px-3 border border-green-500 text-green-600 text-sm font-medium rounded hover:bg-green-50 transition-colors">
                {button.text || 'Quick Reply'}
              </button>
            )}
            {button.type === 'PHONE_NUMBER' && (
              <button className="w-full py-2 px-3 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition-colors">
                📞 {button.text || 'Call Now'}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm mx-auto">
      {/* WhatsApp Header */}
      <div className="bg-green-600 text-white p-3">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center mr-3">
            <span className="text-xs font-bold">YB</span>
          </div>
          <div>
            <h3 className="font-medium text-sm">Your Business</h3>
            <p className="text-xs opacity-80">Template Message</p>
          </div>
        </div>
      </div>

      {/* Message Preview */}
      <div className="bg-green-50 min-h-[400px] p-4">
        <div className="bg-white rounded-lg shadow-sm max-w-[280px] ml-auto">
          {renderHeaderPreview()}
          {renderBodyPreview()}
          {renderFooterPreview()}
          {renderButtonsPreview()}
          
          {/* Message Time */}
          <div className="px-4 py-2 text-right">
            <p className="text-xs text-gray-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Label */}
      <div className="bg-gray-50 px-4 py-2 border-t">
        <p className="text-xs text-center text-gray-500 flex items-center justify-center">
          <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
          WhatsApp Preview
        </p>
      </div>
    </div>
  );
};

export default WhatsAppPreview;
