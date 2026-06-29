import './App.css'
import 'antd/dist/reset.css';
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import 'leaflet/dist/leaflet.css';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/ScrollToTop';
import { persistor, store } from './store';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { themeConfig } from './theme.config';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from './configs/queryClient';
import viVN from "antd/locale/vi_VN";

function App() {
  return (
     <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
              <Router>
                <ScrollToTop/>
                <ConfigProvider locale={viVN} theme={themeConfig}>
                  <AntdApp>
                    <div className="App">
                      <AppRoutes />
                    </div>
                  </AntdApp>
                </ConfigProvider>
              </Router>
            </GoogleOAuthProvider>
          </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}

export default App;