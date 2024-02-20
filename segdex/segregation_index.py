# Implementing Segregation Index based on Theil Index
# References: Reardon(2011), Reardon&Bischoff(2011)(Appendix A)

import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy.stats import rankdata
import math
import numpy as np
import pandas as pd
from typing import List, Any


def delta_m(m):
    S = 0
    for n in range(m+1):
        s = ((-1)**(m-n))*math.comb(m,n)
        s = s/(m-n+2)**2
        S += s
    d = (2/(m+2)**2) + 2*S
    return d

def entropy_p(p):
    if p==0: p+=1e-6
    elif p==1: p-=1e-6
    e = -(p*np.log2(p) + (1-p)*np.log2(1-p))
    return e

def Theil_p(tt,pp):
    tt,pp = map(np.array, [tt,pp])
    T = np.sum(tt)
    P = np.sum(tt*pp)/T
    e_P = entropy_p(P)
    e_pp = np.array([entropy_p(p) for p in pp])

    H = 1 - np.sum(tt*e_pp)/(T*e_P)
    return H

def get_weighted_rank(ss,ww):
    ss,ww = map(np.array, [ss,ww])
    ss_ = ss*ww
    rr = rankdata(ss_)
    # ~1 normalization (X)
    # rr = rr/len(rr)
    return rr

def from_vvs_to_rrs(vv_s, ww_s=None):
    if ww_s==None:
        tt = [len(e) for e in vv_s]
        vvs = []
        for vv in vv_s:
            vvs.extend(vv)
        rrs = rankdata(vvs)
        ttc = np.cumsum(tt)
        rr_s = [rrs[:ttc[0]]]
        for t1,t2 in zip(ttc[:-1],ttc[1:]):
            rr_s.append(rrs[t1:t2])
        rr_s = np.array(rr_s, dtype=object)
        rr_s = rr_s/len(rrs)
        return rr_s
    else:
        tt = [len(e) for e in vv_s]
        vvs, wws = [],[]
        for vv,ww in zip(vv_s,ww_s):
            vvs.extend(vv)
            wws.extend(ww)
        rrs = get_weighted_rank(vvs,wws)
        ttc = np.cumsum(tt)
        rr_s = [rrs[:ttc[0]]]
        for t1,t2 in zip(ttc[:-1],ttc[1:]):
            rr_s.append(rrs[t1:t2])
        rr_s = np.array(rr_s, dtype=object)
        rr_s = rr_s/len(rrs)
        return rr_s
    
def estimate_Hp(vv_s: List[List[Any]], ww_s=None, K=14, m=4):
    '''
    Arguments:
      vv_s (List[List[values]]): list of lists of values
      ww_s: weights over vv_s
      K: counts of thresholds
      m: degree of regression equation used for the estimation
    '''
    vv_s = from_vvs_to_rrs(vv_s, ww_s=ww_s) # rank-order transformation
    kk = np.array([e/K for e in range(1,K)]) # 1/K ~ (K-1)/K
    e_kk = np.array([entropy_p(k) for k in kk])
    w_kk = e_kk**2
    #
    tt = [len(vv) for vv in vv_s]
    Hp_kk = []
    for k in kk:
        pp = []
        for vv in vv_s:
            vv_k = [e for e in vv if e<=k]
            pp.append(len(vv_k)/len(vv))
        Hp_k = Theil_p(tt,pp)
        Hp_kk.append(Hp_k)
    #
    d = pd.DataFrame({'Hp':Hp_kk, 'p':kk, 'weight': w_kk})
    for n in range(2,m+1):
        d[f"p_{n}"] = d['p']**n
    exog = d[[c for c in d.columns if 'p' in c and 'Hp' not in c]]
    exog = sm.add_constant(exog)
    global f
    f = sm.WLS(endog=d['Hp'], exog=exog, weights=d['weight']).fit()
    #
    betas = [f.params['const'], f.params['p']]
    for n in range(2,m+1):
        betas.append(f.params[f"p_{n}"])
    #
    deltas = [delta_m(e) for e in range(m+1)]
    betas, deltas = map(np.array, [betas, deltas])
    #
    H_r = np.sum(betas*deltas)
    return H_r