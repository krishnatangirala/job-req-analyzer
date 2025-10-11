import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    // Create script element for Digital Ocean chatbot
    const script = document.createElement('script');

    script.src = 'https://nwdtgi4rhjpdnf4ehjt5ua4d.agents.do-ai.run/static/chatbot/widget.js';
    script.async = true;
    script.setAttribute('data-agent-id', '9c53e226-a676-11f0-b074-4e013e2ddde4');
    script.setAttribute('data-chatbot-id', 'TZ_c2eQTq7EiGKRQqqVQC2wMRZNLG8D7');
    script.setAttribute('data-name', 'AskDoe(TM) Chatbot');
    script.setAttribute('data-primary-color', '#031B4E');
    script.setAttribute('data-secondary-color', '#E5E8ED');
    script.setAttribute('data-button-background-color', '#0061EB');
    script.setAttribute('data-starting-message', 'Hello there! I am Doe, your AI-powered Agent who can help with your job search in 2025. How can I help you?');
    script.setAttribute('data-logo', '/static/chatbot/icons/default-agent.svg');
    
    // Add load and error handlers
    script.onload = () => {
      console.log('✅ Chatbot widget loaded successfully');
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load chatbot widget:', error);
    };
    
    // Append script to document body
    document.body.appendChild(script);
    
    // Cleanup function to remove script when component unmounts
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleAskDoe = async () => {
    if (!selectedFile) {
      alert('Please upload a resume first!');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('resume', selectedFile);
    
    try {
      // Replace with your actual Node.js endpoint URL
      const res = await fetch('http://localhost:5000/analyze-resume', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      // Store the raw response from the API
      setResponse(data.response || data.analysis || data.message || JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse('Error: Unable to analyze resume. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to format inline markdown (bold, italic)
  const formatInlineMarkdown = (text) => {
    if (!text) return text;
    
    // Replace **bold** with <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace *italic* with <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace em dashes
    text = text.replace(/–/g, '—');
    text = text.replace(/‑/g, '-');
    
    return text;
  };

  // Function to format the markdown-style response
  const formatResponse = (text) => {
    if (!text) return null;

    // Split by lines and process
    const lines = text.split('\n');
    const elements = [];
    let currentSection = [];
    let inTable = false;
    let tableRows = [];
    let inList = false;
    let listItems = [];

    const flushSection = (index) => {
      if (currentSection.length > 0) {
        const content = formatInlineMarkdown(currentSection.join(' '));
        elements.push(<p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: content }} />);
        currentSection = [];
      }
    };

    const flushList = (index) => {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="formatted-list">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      // Blockquote (starts with >)
      if (line.trim().startsWith('>')) {
        flushSection(index);
        flushList(index);
        const content = formatInlineMarkdown(line.replace(/^>\s*/, '').trim());
        elements.push(<blockquote key={`bq-${index}`} className="tip-blockquote" dangerouslySetInnerHTML={{ __html: content }} />);
      }
      // Headers (##, ###)
      else if (line.startsWith('###')) {
        flushSection(index);
        flushList(index);
        elements.push(<h3 key={`h3-${index}`} className="section-subheading">{line.replace(/###/g, '').trim()}</h3>);
      } else if (line.startsWith('##')) {
        flushSection(index);
        flushList(index);
        elements.push(<h2 key={`h2-${index}`} className="section-heading">{line.replace(/##/g, '').trim()}</h2>);
      }
      // Table detection
      else if (line.includes('|') && line.trim().startsWith('|')) {
        flushSection(index);
        flushList(index);
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
      } else if (inTable && !line.includes('|')) {
        // End of table
        inTable = false;
        elements.push(renderTable(tableRows, index));
        tableRows = [];
        if (line.trim()) {
          currentSection.push(line);
        }
      }
      // Bullet points
      else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        flushSection(index);
        if (!inList) {
          inList = true;
        }
        const content = formatInlineMarkdown(line.replace(/^[-•]\s*/, '').trim());
        listItems.push(<li key={`li-${index}`} className="bullet-item" dangerouslySetInnerHTML={{ __html: content }} />);
      }
      // Numbered lists
      else if (/^\d+\./.test(line.trim())) {
        flushSection(index);
        flushList(index);
        const content = formatInlineMarkdown(line.replace(/^\d+\.\s*/, '').trim());
        elements.push(<li key={`li-${index}`} className="numbered-item" dangerouslySetInnerHTML={{ __html: content }} />);
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        flushSection(index);
        flushList(index);
        elements.push(<hr key={`hr-${index}`} className="section-divider" />);
      }
      // Regular text
      else if (line.trim()) {
        if (inList) {
          flushList(index);
        }
        currentSection.push(line);
      } else {
        flushSection(index);
        flushList(index);
      }
    });

    // Handle any remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableRows, 'final'));
    }

    // Handle any remaining list
    if (listItems.length > 0) {
      elements.push(<ul key="ul-final" className="formatted-list">{listItems}</ul>);
    }

    // Handle any remaining section
    if (currentSection.length > 0) {
      const content = formatInlineMarkdown(currentSection.join(' '));
      elements.push(<p key="p-final" dangerouslySetInnerHTML={{ __html: content }} />);
    }

    return elements;
  };

  // Helper function to render tables
  const renderTable = (rows, key) => {
    if (rows.length < 2) return null;

    const parseRow = (row) => {
      return row.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
    };

    const headers = parseRow(rows[0]);
    const dataRows = rows.slice(2).map(parseRow); // Skip separator row

    return (
      <div key={`table-${key}`} className="table-container">
        <table className="response-table">
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th key={i}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/<br>/g, '<br/>') }}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo-container">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/8637/8637099.png" 
              alt="AskDoe Logo" 
              className="logo"
            />
          </div>
          
          <h1 className="nav-title">Welcome to AskDoe</h1>
          
          <div className="logo-spacer"></div>
        </div>
      </nav>

      {/* Main Body - Response Display Area */}
      <main className="main-content">
        <div className="response-card">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Analyzing your resume...</p>
            </div>
          ) : response ? (
            <div className="response-content">
              <div className="response-header">
                <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2>Analysis Complete</h2>
              </div>
              <div className="response-text">{formatResponse(response)}</div>
            </div>
          ) : (
            <div className="empty-state">
              <svg className="document-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="empty-text">Upload your resume to get started</p>
              <p className="empty-subtext">Our AI will analyze your resume and provide detailed feedback</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Section - File Upload */}
      <footer className="footer">
        <div className="footer-content">
          <div className="upload-section">
            <label htmlFor="file-upload" className="file-upload-label">
              <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="upload-text">
                {fileName || 'Choose Resume (PDF, DOC, DOCX)'}
              </span>
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="file-input"
            />
            
            <button
              onClick={handleAskDoe}
              disabled={loading || !selectedFile}
              className={`ask-button ${loading || !selectedFile ? 'disabled' : ''}`}
            >
              {loading ? (
                <>
                  <div className="button-spinner"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Ask Doe
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;