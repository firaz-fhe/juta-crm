import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Lucide from '@/components/Base/Lucide';
import Button from '@/components/Base/Button';
import { FormInput, FormLabel, FormHelp } from '@/components/Base/Form';
import LoadingIcon from '@/components/Base/LoadingIcon';
import { Dialog } from '@/components/Base/Headless';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';

interface SyncResults {
  success: boolean;
  message?: string;
  data?: {
    totalContacts: number;
    syncedContacts: number;
    updatedContacts: number;
    newContacts: number;
    duration: string;
    sheetId: string;
    sheetName: string;
  };
  error?: string;
}

interface ContactStats {
  database: {
    totalContacts: number;
    contactsWithMessages: number;
    contactsWithoutMessages: number;
  };
  sheet: {
    totalContacts: number;
    sheetName: string;
    spreadsheetId: string;
  } | null;
}

const ContactSync = () => {
  const [companyId, setCompanyId] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('Contacts');
  const [syncing, setSyncing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedCompanyId = localStorage.getItem('contactSync_companyId');
    const savedSheetId = localStorage.getItem('contactSync_sheetId');
    const savedSheetName = localStorage.getItem('contactSync_sheetName');

    if (savedCompanyId) setCompanyId(savedCompanyId);
    if (savedSheetId) setSheetId(savedSheetId);
    if (savedSheetName) setSheetName(savedSheetName);
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('contactSync_companyId', companyId);
    localStorage.setItem('contactSync_sheetId', sheetId);
    localStorage.setItem('contactSync_sheetName', sheetName);
    toast.success('Settings saved!');
  };

  // Fetch statistics
  const fetchStats = async () => {
    if (!companyId) {
      toast.error('Please enter a Company ID');
      return;
    }

    setLoadingStats(true);
    try {
      const params: any = { companyId };
      if (sheetId) params.sheetId = sheetId;
      if (sheetName) params.sheetName = sheetName;

      const response = await axios.get(`${API_URL}/api/sync/contacts-stats`, { params });
      setStats(response.data.data);
      toast.success('Statistics loaded successfully');
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  // Trigger sync
  const handleSync = async () => {
    if (!companyId) {
      toast.error('Please enter a Company ID');
      return;
    }

    if (!sheetId) {
      toast.error('Please enter a Google Sheet ID');
      return;
    }

    setSyncing(true);
    setSyncResults(null);

    try {
      const params: any = {};
      if (sheetId) params.sheetId = sheetId;
      if (sheetName) params.sheetName = sheetName;

      const response = await axios.post(
        `${API_URL}/api/sync/contacts-to-sheets`,
        { companyId },
        { params }
      );

      setSyncResults(response.data);
      setShowResultsDialog(true);

      if (response.data.success) {
        toast.success('Contacts synced successfully!');
        // Refresh stats after successful sync
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Error syncing contacts:', error);
      const errorData = error.response?.data;
      setSyncResults({
        success: false,
        error: errorData?.error || 'Failed to sync contacts',
      });
      setShowResultsDialog(true);
      toast.error(errorData?.error || 'Failed to sync contacts');
    } finally {
      setSyncing(false);
    }
  };

  // Clear sheet
  const handleClearSheet = async () => {
    if (!confirm('Are you sure you want to clear all contacts from the sheet? This cannot be undone!')) {
      return;
    }

    try {
      const params: any = {};
      if (sheetId) params.sheetId = sheetId;
      if (sheetName) params.sheetName = sheetName;

      await axios.post(
        `${API_URL}/api/sync/clear-sheet`,
        { confirm: true },
        { params }
      );

      toast.success('Sheet cleared successfully');
      await fetchStats();
    } catch (error: any) {
      console.error('Error clearing sheet:', error);
      toast.error(error.response?.data?.error || 'Failed to clear sheet');
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="flex items-center h-10 mb-5">
            <h2 className="text-lg font-medium truncate mr-5">Contact Sync to Google Sheets</h2>
          </div>

          {/* Configuration Card */}
          <div className="box p-5 mb-5">
            <div className="flex items-center pb-5 mb-5 border-b border-slate-200/60">
              <div>
                <div className="text-base font-medium">Configuration</div>
                <div className="text-slate-500 mt-1">Configure your sync settings</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 xl:col-span-6">
                <FormLabel htmlFor="companyId">Company ID *</FormLabel>
                <FormInput
                  id="companyId"
                  type="text"
                  placeholder="e.g., 075"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                />
                <FormHelp>The WhatsApp bot company/account ID to sync contacts from</FormHelp>
              </div>

              <div className="col-span-12 xl:col-span-6">
                <FormLabel htmlFor="sheetId">Google Sheet ID *</FormLabel>
                <FormInput
                  id="sheetId"
                  type="text"
                  placeholder="1A2B3C4D..."
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                />
                <FormHelp>The ID from your Google Sheet URL</FormHelp>
              </div>

              <div className="col-span-12 xl:col-span-6">
                <FormLabel htmlFor="sheetName">Sheet Tab Name</FormLabel>
                <FormInput
                  id="sheetName"
                  type="text"
                  placeholder="Contacts"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
                <FormHelp>The name of the tab/sheet within your Google Sheet</FormHelp>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="primary" onClick={saveSettings}>
                <Lucide icon="Save" className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="box p-5 mb-5">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-200/60">
              <div>
                <div className="text-base font-medium">Statistics</div>
                <div className="text-slate-500 mt-1">View contact and sheet statistics</div>
              </div>
              <Button variant="outline-primary" onClick={fetchStats} disabled={loadingStats}>
                {loadingStats ? (
                  <>
                    <LoadingIcon icon="oval" className="w-4 h-4 mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Lucide icon="RefreshCw" className="w-4 h-4 mr-2" />
                    Refresh Stats
                  </>
                )}
              </Button>
            </div>

            {stats ? (
              <div className="grid grid-cols-12 gap-5">
                {/* Database Stats */}
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <div className="relative">
                    <div className="text-slate-500">Total Contacts in Database</div>
                    <div className="text-2xl font-medium mt-1">{stats.database.totalContacts}</div>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <div className="relative">
                    <div className="text-slate-500">With Messages</div>
                    <div className="text-2xl font-medium mt-1 text-success">{stats.database.contactsWithMessages}</div>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <div className="relative">
                    <div className="text-slate-500">Without Messages</div>
                    <div className="text-2xl font-medium mt-1 text-slate-400">{stats.database.contactsWithoutMessages}</div>
                  </div>
                </div>

                {stats.sheet && (
                  <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <div className="relative">
                      <div className="text-slate-500">In Google Sheet</div>
                      <div className="text-2xl font-medium mt-1 text-primary">{stats.sheet.totalContacts}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-5">
                Click "Refresh Stats" to load statistics
              </div>
            )}
          </div>

          {/* Actions Card */}
          <div className="box p-5">
            <div className="flex items-center pb-5 mb-5 border-b border-slate-200/60">
              <div>
                <div className="text-base font-medium">Actions</div>
                <div className="text-slate-500 mt-1">Sync or manage your contacts</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <>
                    <LoadingIcon icon="oval" className="w-5 h-5 mr-2" />
                    Syncing Contacts...
                  </>
                ) : (
                  <>
                    <Lucide icon="Upload" className="w-5 h-5 mr-2" />
                    Sync Contacts to Sheet
                  </>
                )}
              </Button>

              <Button variant="outline-danger" size="lg" onClick={handleClearSheet}>
                <Lucide icon="Trash2" className="w-5 h-5 mr-2" />
                Clear Sheet
              </Button>
            </div>

            <div className="mt-5 p-4 bg-slate-100 rounded-lg">
              <div className="flex">
                <Lucide icon="Info" className="w-5 h-5 mr-3 text-primary" />
                <div>
                  <div className="font-medium mb-1">Sync Information</div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Syncing will update existing contacts and add new ones</li>
                    <li>• Profile pictures and business account status will be fetched from WhatsApp</li>
                    <li>• Message statistics are calculated from your database</li>
                    <li>• The sync process may take a few minutes for large contact lists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onClose={() => setShowResultsDialog(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="mr-auto text-base font-medium flex items-center">
              {syncResults?.success ? (
                <>
                  <Lucide icon="CheckCircle" className="w-5 h-5 mr-2 text-success" />
                  Sync Completed Successfully
                </>
              ) : (
                <>
                  <Lucide icon="XCircle" className="w-5 h-5 mr-2 text-danger" />
                  Sync Failed
                </>
              )}
            </h2>
          </Dialog.Title>
          <Dialog.Description className="grid gap-4">
            {syncResults?.success && syncResults.data ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <div className="text-xs text-slate-500">Total Contacts</div>
                    <div className="text-2xl font-medium mt-1">{syncResults.data.totalContacts}</div>
                  </div>
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <div className="text-xs text-slate-500">Synced</div>
                    <div className="text-2xl font-medium mt-1 text-success">{syncResults.data.syncedContacts}</div>
                  </div>
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <div className="text-xs text-slate-500">Updated</div>
                    <div className="text-2xl font-medium mt-1 text-warning">{syncResults.data.updatedContacts}</div>
                  </div>
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <div className="text-xs text-slate-500">New</div>
                    <div className="text-2xl font-medium mt-1 text-primary">{syncResults.data.newContacts}</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-100 rounded-lg">
                  <div className="text-xs text-slate-500 mb-2">Details</div>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Duration:</span> {syncResults.data.duration}</div>
                    <div><span className="font-medium">Sheet:</span> {syncResults.data.sheetName}</div>
                    <div className="text-xs text-slate-500 mt-2">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${syncResults.data.sheetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center"
                      >
                        <Lucide icon="ExternalLink" className="w-3 h-3 mr-1" />
                        Open Google Sheet
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-danger/10 text-danger rounded-lg">
                <div className="font-medium mb-1">Error</div>
                <div className="text-sm">{syncResults?.error || 'An unknown error occurred'}</div>
              </div>
            )}
          </Dialog.Description>
          <Dialog.Footer>
            <Button type="button" variant="outline-secondary" onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default ContactSync;
