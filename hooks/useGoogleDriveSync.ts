
import { useState, useEffect } from 'react';
import { AppData, ArchiveFile } from '../types';
import { useLocalStorage } from './useLocalStorage';

// These declarations are necessary because the Google API scripts are loaded dynamically.
declare const gapi: any;
declare const google: any;

interface UseGoogleDriveSyncProps {
    onImportData: (backup: AppData) => void;
    appData: AppData;
}


export const useGoogleDriveSync = (props: UseGoogleDriveSyncProps) => {
    const { onImportData, appData } = props;

    // --- CONFIGURATION REQUISE ---
    // IMPORTANT: Remplacez la valeur ci-dessous par votre propre Client ID obtenu depuis la Google Cloud Console.
    const CLIENT_ID: string = '46851782135-70g55i7r9f2hhiqsnf0cbhrae5bs76bh.apps.googleusercontent.com';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const FILENAME = 'gestion-finances-personnelles-data.json';
    
    const [gapiReady, setGapiReady] = useState(false);
    const [gisReady, setGisReady] = useState(false);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'no_client_id'>('idle');
    const [lastSync, setLastSync] = useLocalStorage<string | null>('googleDriveLastSync', null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            setSyncStatus('no_client_id');
            return;
        }

        const gapiScript = document.createElement('script');
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => gapi.load('client', () => setGapiReady(true));
        document.body.appendChild(gapiScript);

        const gisScript = document.createElement('script');
        gisScript.src = "https://accounts.google.com/gsi/client";
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onload = () => setGisReady(true);
        document.body.appendChild(gisScript);

        return () => {
            const gapiScriptElem = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
            const gisScriptElem = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (gapiScriptElem) document.body.removeChild(gapiScriptElem);
            if (gisScriptElem) document.body.removeChild(gisScriptElem);
        };
    }, []);

    useEffect(() => {
        const initClients = async () => {
            if (gapiReady) {
                try {
                    await gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                } catch(e) {
                    console.error("Error initializing GAPI client", e);
                    setSyncStatus('error');
                }
            }
            if (gisReady) {
                try {
                    const client = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: async (tokenResponse: any) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                gapi.client.setToken(tokenResponse);
                                setIsLoggedIn(true);
                                try {
                                    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                        headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                                    });
                                    const userInfo = await response.json();
                                    setUser(userInfo);
                                } catch (e) {
                                    console.error('Error fetching user info', e);
                                }
                            }
                        },
                    });
                    setTokenClient(client);
                } catch(e) {
                    console.error("Error initializing GIS client", e);
                    setSyncStatus('error');
                }
            }
        };
        initClients();
    }, [gapiReady, gisReady]);

    const getFile = async () => {
        const response = await gapi.client.drive.files.list({
            q: `name='${FILENAME}' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, modifiedTime)',
        });
        return response.result.files.length > 0 ? response.result.files[0] : null;
    };
    
    const readFile = async (fileId: string): Promise<AppData> => {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return JSON.parse(response.body);
    };

    const createFile = async (content: AppData | ArchiveFile, fileName: string) => {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = { name: fileName, mimeType: 'application/json' };
        
        const multipartRequestBody =
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter + 'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(content, null, 2) +
            close_delim;

        const request = await gapi.client.request({
            'path': '/upload/drive/v3/files',
            'method': 'POST',
            'params': { 'uploadType': 'multipart' },
            'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            'body': multipartRequestBody
        });
        return request.result;
    };

    const updateFile = async (fileId: string, content: AppData) => {
        const request = await gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: JSON.stringify(content, null, 2)
        });
        return request.result;
    };

    const handleConnect = () => tokenClient?.requestAccessToken();

    const handleDisconnect = () => {
        if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ? La synchronisation sera désactivée.")) {
            const token = gapi.client.getToken();
            if (token) {
                google.accounts.oauth2.revoke(token.access_token, () => {
                    gapi.client.setToken(null);
                    setIsLoggedIn(false);
                    setUser(null);
                });
            }
        }
    };

    const handleSync = async () => {
        if (!isLoggedIn) {
            alert("Veuillez vous connecter d'abord.");
            handleConnect();
            return;
        }
        setSyncStatus('syncing');
        try {
            const localData = { ...appData, lastUpdated: new Date().toISOString() };
            const cloudFile = await getFile();

            if (!cloudFile) {
                if (window.confirm("Aucune donnée n'existe sur le cloud. Voulez-vous envoyer vos données locales pour créer la sauvegarde ?")) {
                    await createFile(localData, FILENAME);
                    setLastSync(new Date().toISOString());
                    setSyncStatus('success');
                } else {
                    setSyncStatus('idle');
                }
                return;
            }

            const localDate = new Date(localData.lastUpdated).getTime();
            const cloudDate = new Date(cloudFile.modifiedTime).getTime();
            
            if (Math.abs(localDate - cloudDate) < 5000) { // 5-second tolerance
                setLastSync(new Date().toISOString());
                setSyncStatus('success');
                return;
            }

            if (localDate > cloudDate) {
                if (window.confirm("Vos données locales sont plus récentes. Voulez-vous mettre à jour les données sur le cloud ?")) {
                    await updateFile(cloudFile.id, localData);
                    setLastSync(new Date().toISOString());
                    setSyncStatus('success');
                } else {
                    setSyncStatus('idle');
                }
            } else {
                if (window.confirm("Des données plus récentes sont sur le cloud. Voulez-vous les télécharger ? ATTENTION : Vos modifications locales non synchronisées seront perdues.")) {
                    const cloudData = await readFile(cloudFile.id);
                    onImportData(cloudData);
                    setLastSync(new Date().toISOString());
                    setSyncStatus('success');
                } else {
                    setSyncStatus('idle');
                }
            }
        } catch (e) {
            console.error("Sync error:", e);
            setSyncStatus('error');
            alert("Une erreur est survenue pendant la synchronisation.");
        } finally {
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    };

    const handleForceUpload = async () => {
        if (!isLoggedIn) {
            alert("Veuillez vous connecter d'abord.");
            handleConnect();
            return;
        }
        if (!window.confirm("Êtes-vous sûr de vouloir écraser la sauvegarde sur Google Drive avec vos données locales actuelles ?")) {
            return;
        }
        setSyncStatus('syncing');
        try {
            const localData = { ...appData, lastUpdated: new Date().toISOString() };
            const cloudFile = await getFile();

            if (cloudFile) {
                await updateFile(cloudFile.id, localData);
            } else {
                await createFile(localData, FILENAME);
            }
            setLastSync(new Date().toISOString());
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e) {
            console.error("Force upload error:", e);
            setSyncStatus('error');
            alert("Une erreur est survenue lors de l'envoi forcé.");
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    };

    const handleForceDownload = async () => {
        if (!isLoggedIn) {
            alert("Veuillez vous connecter d'abord.");
            handleConnect();
            return;
        }
        if (!window.confirm("ATTENTION : Vos données locales actuelles (tous profils confondus) seront écrasées par celles de Google Drive. Cette action est irréversible. Continuer ?")) {
            return;
        }
        setSyncStatus('syncing');
        try {
            const cloudFile = await getFile();
            if (!cloudFile) {
                alert("Aucune sauvegarde trouvée sur Google Drive.");
                setSyncStatus('idle');
                return;
            }

            const cloudData = await readFile(cloudFile.id);
            onImportData(cloudData); // This will call setAppData
            setLastSync(new Date().toISOString());
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e) {
            console.error("Force download error:", e);
            setSyncStatus('error');
            alert("Une erreur est survenue lors de la récupération forcée.");
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    };

    // --- Archive Functions ---
    const uploadArchive = async (archiveContent: ArchiveFile, fileName: string) => {
        if (!isLoggedIn) throw new Error("Non connecté à Google Drive.");
        return await createFile(archiveContent, fileName);
    };

    const listArchives = async (): Promise<{ id: string, name: string }[]> => {
        if (!isLoggedIn) throw new Error("Non connecté à Google Drive.");
        const response = await gapi.client.drive.files.list({
            q: "name contains 'archive-finances-' and trashed=false",
            spaces: 'drive',
            fields: 'files(id, name)',
            orderBy: 'name desc',
        });
        return response.result.files || [];
    };

    const downloadArchive = async (fileId: string): Promise<ArchiveFile> => {
        if (!isLoggedIn) throw new Error("Non connecté à Google Drive.");
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return JSON.parse(response.body);
    };
    
    return {
        isLoggedIn,
        user,
        syncStatus,
        lastSync,
        handleConnect,
        handleDisconnect,
        handleSync,
        handleForceUpload,
        handleForceDownload,
        uploadArchive,
        listArchives,
        downloadArchive,
    };
};
