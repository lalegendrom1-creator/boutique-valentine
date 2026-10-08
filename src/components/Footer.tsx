import { Scissors, Mail, Phone, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-medium text-white">
                Beauty<span className="text-primary-400">Near</span>
              </span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              La plateforme qui connecte les clients aux meilleurs salons de beauté près de chez eux.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary-400 transition-colors">Accueil</Link></li>
              <li><Link to="/search" className="hover:text-primary-400 transition-colors">Rechercher un salon</Link></li>
              <li><Link to="/register-salon" className="hover:text-primary-400 transition-colors">Inscrire mon salon</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-primary-400 transition-colors">Comment ça marche</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-400" /> contact@beautynear.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400" /> +228 90 00 00 00
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-400" /> Lomé, Togo
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-primary-400 transition-colors">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-400 transition-colors">Confidentialité</Link></li>
              <li><Link to="/cookies" className="hover:text-primary-400 transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
          © 2026 BeautyNear. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
