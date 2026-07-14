import { useState, useRef } from 'react'
import { createFileRoute, Link, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Lock,
  Palette,
  Mail,
  Eye,
  EyeOff,
  Save,
  Camera,
  Upload,
  Shield,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import { usersApi } from '@/api/users'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})


const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-yellow-500',
  'bg-cyan-500',
]

export function Settings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { location } = useRouterState()
  const isAdminContext = location.pathname.startsWith('/admin')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState(user?.role_name || '')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showAvatarOptions, setShowAvatarOptions] = useState(false)
  const [selectedAvatarColor, setSelectedAvatarColor] = useState('bg-blue-500')
  const [profileImage, setProfileImage] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)

  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  const [emailPreferences, setEmailPreferences] = useState({
    projectUpdates: true,
    taskAssignments: true,
    deadlineReminders: true,
    weeklyReports: false,
    invoiceAlerts: true,
  })

  const updateMeMutation = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setIsEditingProfile(false)
      toast.success('Profile updated successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update profile')
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: usersApi.updatePassword,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsEditingPassword(false)
      toast.success('Password changed successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to change password')
    },
  })

  const handleProfileUpdate = () => {
    if (!username.trim()) { toast.error('Name cannot be empty'); return }
    if (!email.trim()) { toast.error('Email cannot be empty'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email address'); return }
    updateMeMutation.mutate({ full_name: username.trim(), email: email.trim(), role_name: role || undefined })
  }

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields'); return
    }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    updatePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    toast.success(`Switched to ${newTheme} mode`)
  }

  const handleEmailPreferenceChange = (key: string, value: boolean) => {
    setEmailPreferences((prev) => ({ ...prev, [key]: value }))
    toast.success('Email preferences updated')
  }

  const handleAvatarColorChange = (color: string) => {
    setSelectedAvatarColor(color)
    setProfileImage('')
    setShowAvatarOptions(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error('Image size should be less than 5MB'); return }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
        setShowAvatarOptions(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account preferences and settings</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <User className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Update your personal information</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className={`w-24 h-24 ${selectedAvatarColor} rounded-full flex items-center justify-center text-white font-bold text-3xl`}>
                  {getInitials(username || 'U')}
                </div>
              )}
              <div>
                <button
                  onClick={() => setShowAvatarOptions(!showAvatarOptions)}
                  disabled={!isEditingProfile}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={18} />
                  Change Avatar
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Upload an image or choose a color</p>
              </div>
            </div>

            {showAvatarOptions && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Custom Image
                  </label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Upload size={18} />
                    Upload Image
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Or Choose a Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleAvatarColorChange(color)}
                        className={`w-10 h-10 ${color} rounded-full hover:scale-110 transition-transform ${
                          selectedAvatarColor === color && !profileImage ? 'ring-4 ring-blue-400 ring-offset-2' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditingProfile}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditingProfile}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!isEditingProfile}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            >
              <option value="">— No role —</option>
              <option value="drafter">Drafter</option>
              <option value="engineer">Engineer</option>
              <option value="project_manager">Project Manager</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            {isEditingProfile ? (
              <>
                <button
                  onClick={handleProfileUpdate}
                  disabled={updateMeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {updateMeMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setIsEditingProfile(false); setUsername(user?.full_name || ''); setEmail(user?.email || ''); setRole(user?.role_name || '') }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <Lock className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Change your password</p>
            </div>
          </div>
          {!isEditingPassword && (
            <button
              onClick={() => setIsEditingPassword(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Change Password
            </button>
          )}
        </div>

        {isEditingPassword ? (
          <div className="space-y-4">
            {[
              { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, toggle: () => setShowCurrentPassword(!showCurrentPassword) },
              { label: 'New Password', value: newPassword, setter: setNewPassword, show: showNewPassword, toggle: () => setShowNewPassword(!showNewPassword) },
              { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.show ? 'text' : 'password'}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className="w-full px-4 py-2 pr-11 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                  <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {field.show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePasswordChange}
                disabled={updatePasswordMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {updatePasswordMutation.isPending ? 'Saving…' : 'Update Password'}
              </button>
              <button
                onClick={() => { setIsEditingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">Password was last changed on January 15, 2026</p>
        )}
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Palette className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customize how the app looks</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === t
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white capitalize">{t}</span>
                {theme === t && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-left mt-1">
                {t === 'light' ? 'Clean and bright interface' : 'Easy on the eyes at night'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Section — superusers only */}
      {user?.is_superuser && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Administration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Access admin tools and system settings</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You have superuser privileges. The admin dashboard lets you manage users, roles, and system-wide configuration.
          </p>
          {isAdminContext ? (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
            >
              <LayoutDashboard size={18} />
              Switch to User View
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Shield size={18} />
              Go to Admin Dashboard
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}

      {/* Email Preferences Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <Mail className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email Preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose what emails you want to receive</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'projectUpdates', label: 'Project Updates', description: 'Get notified about project status changes' },
            { key: 'taskAssignments', label: 'Task Assignments', description: 'When you are assigned to a new task' },
            { key: 'deadlineReminders', label: 'Deadline Reminders', description: 'Reminders for upcoming deadlines' },
            { key: 'weeklyReports', label: 'Weekly Reports', description: 'Summary of your weekly activity' },
            { key: 'invoiceAlerts', label: 'Invoice Alerts', description: 'Updates on invoicing and payments' },
          ].map((pref) => (
            <div key={pref.key} className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{pref.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{pref.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailPreferences[pref.key as keyof typeof emailPreferences]}
                  onChange={(e) => handleEmailPreferenceChange(pref.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}